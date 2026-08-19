/**
 * The consent system-of-record: CRUD over `consent` / `signer` / `consent_event`.
 *
 * Every status change goes through `applyTransition`, the one place that (a)
 * validates the move against the state machine, (b) writes the new status,
 * (c) appends a WORM `consent_event`, and (d) fires the EventSink. That keeps
 * the audit trail total and gives the outbox a single tap point.
 */

import { randomUUID } from "node:crypto";
import type { Client } from "@libsql/client";
import type { Config } from "@/lib/config";
import { db } from "@/lib/db/client";
import {
  canTransition,
  evaluatePolicy,
  type SignerDecision,
  type State,
} from "@/lib/consent/machine";
import { noopSink, type EventSink } from "@/lib/events/sink";

let sink: EventSink = noopSink;
/** Swap the sink (the outbox worker wires this). */
export function setSink(s: EventSink): void {
  sink = s;
}

export type Scope = { name: string; description?: string };

export type SignerRow = {
  id: string;
  consent_id: string;
  subject: string;
  decision: SignerDecision;
  acr: string | null;
  decided_at: string;
};

export type ConsentEventRow = {
  id: string;
  consent_id: string;
  type: string;
  previous_state: string | null;
  new_state: string;
  reason: string | null;
  actor_subject: string | null;
  at: string;
  sequence: number;
};

export type ConsentRow = {
  id: string;
  authorization_id: string;
  grant_id: string | null;
  client_id: string;
  client_name: string | null;
  subject: string;
  status: State;
  purpose: string | null;
  scopes: Scope[];
  authorization_details: unknown[];
  valid_from: string | null;
  valid_to: string | null;
  frequency: string | null;
  recurring: boolean;
  required_signers: number;
  created_at: string;
  status_updated_at: string;
};

export type CreateInput = {
  authorizationId: string;
  clientId: string;
  clientName?: string;
  subject: string;
  purpose?: string;
  scopes?: Scope[];
  authorizationDetails?: unknown[];
  validFrom?: string;
  validTo?: string;
  frequency?: string;
  recurring?: boolean;
  requiredSigners?: number;
};

const now = () => new Date().toISOString();

function hydrate(row: Record<string, unknown>): ConsentRow {
  return {
    id: row.id as string,
    authorization_id: row.authorization_id as string,
    grant_id: (row.grant_id as string | null) ?? null,
    client_id: row.client_id as string,
    client_name: (row.client_name as string | null) ?? null,
    subject: row.subject as string,
    status: row.status as State,
    purpose: (row.purpose as string | null) ?? null,
    scopes: parseJson<Scope[]>(row.scopes as string | null, []),
    authorization_details: parseJson<unknown[]>(row.authorization_details as string | null, []),
    valid_from: (row.valid_from as string | null) ?? null,
    valid_to: (row.valid_to as string | null) ?? null,
    frequency: (row.frequency as string | null) ?? null,
    recurring: Boolean(row.recurring),
    required_signers: Number(row.required_signers),
    created_at: row.created_at as string,
    status_updated_at: row.status_updated_at as string,
  };
}

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Create a Pending consent record. */
export async function createPending(config: Config, input: CreateInput): Promise<ConsentRow> {
  const d = db(config);
  const id = randomUUID();
  const ts = now();
  await d.execute({
    sql: `INSERT INTO consent (id, authorization_id, client_id, client_name, subject, status,
            purpose, scopes, authorization_details, valid_from, valid_to, frequency, recurring,
            required_signers, created_at, status_updated_at)
          VALUES (?,?,?,?,?, 'Pending', ?,?,?,?,?,?,?, ?, ?, ?)`,
    args: [
      id,
      input.authorizationId,
      input.clientId,
      input.clientName ?? null,
      input.subject,
      input.purpose ?? null,
      JSON.stringify(input.scopes ?? []),
      JSON.stringify(input.authorizationDetails ?? []),
      input.validFrom ?? null,
      input.validTo ?? null,
      input.frequency ?? null,
      input.recurring ? 1 : 0,
      input.requiredSigners ?? 1,
      ts,
      ts,
    ],
  });
  await appendEvent(d, id, "consent.requested", null, "Pending", undefined, input.subject);
  return (await getById(config, id))!;
}

export async function getById(config: Config, id: string): Promise<ConsentRow | null> {
  return queryOne(config, "SELECT * FROM consent WHERE id = ?", [id]);
}

export async function getByAuthorizationId(
  config: Config,
  authorizationId: string,
): Promise<ConsentRow | null> {
  return queryOne(config, "SELECT * FROM consent WHERE authorization_id = ?", [authorizationId]);
}

export async function getByGrantId(config: Config, grantId: string): Promise<ConsentRow | null> {
  return queryOne(config, "SELECT * FROM consent WHERE grant_id = ?", [grantId]);
}

/** All consents for a resource owner — the panel list. */
export async function listBySubject(config: Config, subject: string): Promise<ConsentRow[]> {
  const res = await db(config).execute({
    sql: "SELECT * FROM consent WHERE subject = ? ORDER BY created_at DESC",
    args: [subject],
  });
  return res.rows.map((r) => hydrate(r as Record<string, unknown>));
}

async function queryOne(config: Config, sql: string, args: unknown[]): Promise<ConsentRow | null> {
  const res = await db(config).execute({ sql, args: args as never });
  const row = res.rows[0];
  return row ? hydrate(row as Record<string, unknown>) : null;
}

/** The signers recorded against a consent (joint action; one in single-signer V1). */
export async function listSigners(config: Config, consentId: string): Promise<SignerRow[]> {
  const res = await db(config).execute({
    sql: "SELECT * FROM signer WHERE consent_id = ? ORDER BY decided_at ASC",
    args: [consentId],
  });
  return res.rows.map((r) => r as unknown as SignerRow);
}

/** The WORM event stream for a consent — feeds the panel history and /grants/history. */
export async function listEvents(config: Config, consentId: string): Promise<ConsentEventRow[]> {
  const res = await db(config).execute({
    sql: "SELECT * FROM consent_event WHERE consent_id = ? ORDER BY sequence ASC",
    args: [consentId],
  });
  return res.rows.map((r) => r as unknown as ConsentEventRow);
}

/**
 * Record a signer decision and re-evaluate the m-of-N policy, transitioning the
 * consent once the policy is decided. Returns the resulting status. V1 calls this
 * once (single signer); the evaluator is N-general.
 */
export async function recordSigner(
  config: Config,
  consent: ConsentRow,
  signer: { subject: string; decision: SignerDecision; acr?: string },
): Promise<State> {
  const d = db(config);
  await d.execute({
    sql: `INSERT INTO signer (id, consent_id, subject, decision, acr, decided_at)
          VALUES (?,?,?,?,?,?)`,
    args: [randomUUID(), consent.id, signer.subject, signer.decision, signer.acr ?? null, now()],
  });

  const res = await d.execute({
    sql: "SELECT decision FROM signer WHERE consent_id = ?",
    args: [consent.id],
  });
  const decisions = res.rows.map((r) => (r as unknown as { decision: SignerDecision }).decision);
  const result = evaluatePolicy(consent.required_signers, decisions);
  if (result === "Pending") return "Pending";

  await applyTransition(config, consent, result, {
    reason: result === "Rejected" ? "signer_rejected" : "policy_satisfied",
    actorSubject: signer.subject,
    type: result === "Authorized" ? "consent.authorised" : "consent.rejected",
  });
  return result;
}

/**
 * Link the Authlete grantId after issue (`link-grant`). The grantId lands on the
 * transition into Authorized; if the consent is still Pending (relay ordering),
 * this also completes that transition.
 */
export async function linkGrant(
  config: Config,
  consent: ConsentRow,
  grantId: string,
): Promise<ConsentRow> {
  // Never attach a grant to a finalized consent (out-of-order relay / retry
  // after a revoke) — that would silently re-associate a withdrawn consent.
  if (consent.status !== "Pending" && consent.status !== "Authorized") {
    return consent;
  }
  const d = db(config);
  if (consent.status === "Pending") {
    await applyTransition(config, consent, "Authorized", {
      reason: "grant_linked",
      type: "consent.authorised",
      grantId,
    });
  }
  await d.execute({
    sql: "UPDATE consent SET grant_id = ?, status_updated_at = ? WHERE id = ?",
    args: [grantId, now(), consent.id],
  });
  return (await getById(config, consent.id))!;
}

/** Generic state change (used by `notify` Revoked | Expired, and panel revoke). */
export async function setState(
  config: Config,
  consent: ConsentRow,
  target: State,
  opts: { reason?: string; actorSubject?: string; type?: string } = {},
): Promise<ConsentRow> {
  await applyTransition(config, consent, target, opts);
  return (await getById(config, consent.id))!;
}

/**
 * Revoke every Authorized consent a subject holds for a client. Authlete has no
 * token-less per-grant revoke, so the AS revokes at the client level — the SoR
 * mirrors that: all of the app's active grants for this subject move to Revoked.
 * Returns how many were revoked.
 */
export async function revokeAuthorizedForClient(
  config: Config,
  subject: string,
  clientId: string,
  actorSubject: string,
): Promise<number> {
  const res = await db(config).execute({
    sql: "SELECT * FROM consent WHERE subject = ? AND client_id = ? AND status = 'Authorized'",
    args: [subject, clientId],
  });
  const rows = res.rows.map((r) => hydrate(r as Record<string, unknown>));
  for (const row of rows) {
    await setState(config, row, "Revoked", { reason: "revoked", actorSubject });
  }
  return rows.length;
}

// --- the single transition tap ----------------------------------------------

async function applyTransition(
  config: Config,
  consent: ConsentRow,
  target: State,
  opts: { reason?: string; actorSubject?: string; type?: string; grantId?: string } = {},
): Promise<void> {
  // Re-read the live row so the guard holds even if the caller's snapshot is
  // stale (double submit, out-of-order relay). Keeps the WORM stream honest —
  // no duplicate transition into a state we're already in.
  const live = (await getById(config, consent.id)) ?? consent;
  if (live.status === target) return; // idempotent — already in the target state
  if (!canTransition(live.status, target)) {
    throw new Error(`illegal transition ${live.status} → ${target}`);
  }
  const d = db(config);
  await d.execute({
    sql: "UPDATE consent SET status = ?, status_updated_at = ? WHERE id = ?",
    args: [target, now(), live.id],
  });
  const type = opts.type ?? `consent.${target.toLowerCase()}`;
  await appendEvent(d, live.id, type, live.status, target, opts.reason, opts.actorSubject);
  sink.emit({
    type,
    consentId: live.id,
    grantId: opts.grantId ?? live.grant_id,
    previousState: live.status,
    newState: target,
    reason: opts.reason,
    actorSubject: opts.actorSubject,
  });
}

async function appendEvent(
  d: Client,
  consentId: string,
  type: string,
  previous: string | null,
  next: string,
  reason?: string,
  actorSubject?: string,
): Promise<void> {
  const seq = await d.execute({
    sql: "SELECT COALESCE(MAX(sequence), 0) + 1 AS n FROM consent_event WHERE consent_id = ?",
    args: [consentId],
  });
  const sequence = Number((seq.rows[0] as unknown as { n: number }).n);
  await d.execute({
    sql: `INSERT INTO consent_event (id, consent_id, type, previous_state, new_state, reason,
            actor_subject, at, sequence, stream_id)
          VALUES (?,?,?,?,?,?,?,?,?,?)`,
    args: [
      randomUUID(),
      consentId,
      type,
      previous,
      next,
      reason ?? null,
      actorSubject ?? null,
      now(),
      sequence,
      consentId,
    ],
  });
}
