/**
 * Client for the AS interaction protocol — the same endpoints auth-ui uses. All
 * calls are authenticated with a per-request mutual JWT (see jwt.ts `signToAs`).
 *
 *   fetchInteraction  GET  /api/authorizations/{id}         → the consent to render
 *   reportOutcome     POST /api/authorizations/{id}/outcome → the signer's decision
 *   revokeGrant       POST /api/grants/{grantId}/revoke     → panel-initiated revoke
 *
 * The AS owns Authlete and the redirect back to the RP; we never talk to Authlete
 * directly. A panel revoke goes through the AS, which revokes at Authlete and then
 * notifies us back (see /api/consent/notify) — the panel never revokes directly.
 */

import type { Config } from "@/lib/config";
import type { Scope } from "@/lib/consent/store";
import { signToAs } from "@/lib/auth/jwt";

export type ConsentStep = {
  client?: { client_id?: string; name?: string; logo_uri?: string; policy_uri?: string };
  next?: string;
  consent?: { new: Scope[]; already_granted: Scope[]; authorization_details: unknown[] };
};

/** Fetch the current interaction (expected: the `consent` step) from the AS. */
export async function fetchInteraction(
  config: Config,
  authorizationId: string,
): Promise<ConsentStep> {
  const jwt = await signToAs(config, { authorization: authorizationId });
  const res = await fetch(
    `${config.asBaseUrl}/api/authorizations/${encodeURIComponent(authorizationId)}`,
    { headers: { Authorization: `Bearer ${jwt}` }, cache: "no-store" },
  );
  if (!res.ok) throw new Error(`AS interaction fetch failed (${res.status})`);
  return (await res.json()) as ConsentStep;
}

/** Report the consent outcome through the AS's interaction endpoint. */
export async function reportOutcome(
  config: Config,
  authorizationId: string,
  outcome: Record<string, unknown>,
): Promise<void> {
  const jwt = await signToAs(config, { authorization: authorizationId, outcome });
  const res = await fetch(
    `${config.asBaseUrl}/api/authorizations/${encodeURIComponent(authorizationId)}/outcome`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
      body: "{}",
    },
  );
  if (!res.ok) throw new Error(`AS outcome report failed (${res.status})`);
}

/** Thrown when the AS's first-party per-grant revoke is unavailable (prod / gated
 * off) — the caller should fall back to client-level revocation. */
export class GrantApiUnsupportedError extends Error {}

/**
 * Ask the AS to revoke ONE grant precisely, by grantId (first-party Grant API).
 * The JWT carries the panel-verified `subject`; the AS confirms ownership and
 * revokes just that grant. Throws GrantApiUnsupportedError when the AS returns
 * 501 (the spike isn't deployed) so the caller can fall back.
 */
export async function revokeGrantById(
  config: Config,
  args: { subject: string; grantId: string },
): Promise<void> {
  const jwt = await signToAs(config, { subject: args.subject });
  const res = await fetch(
    `${config.asBaseUrl}/api/grants/${encodeURIComponent(args.grantId)}/revoke`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
      body: "{}",
    },
  );
  if (res.status === 501) throw new GrantApiUnsupportedError("per-grant revoke not supported");
  if (!res.ok) throw new Error(`AS per-grant revoke failed (${res.status})`);
}

/**
 * Client-level fallback: revoke the resource owner's whole authorization for a
 * client (subject+client_id) — used when there's no grant_id or the per-grant
 * API is unavailable. Over-revokes when a client holds several grants, so it's
 * the fallback, not the default.
 */
export async function revokeAuthorization(
  config: Config,
  args: { subject: string; clientId: string },
): Promise<void> {
  const jwt = await signToAs(config, { subject: args.subject, client_id: args.clientId });
  const res = await fetch(`${config.asBaseUrl}/api/grants/revoke`, {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: "{}",
  });
  if (!res.ok) throw new Error(`AS grant revoke failed (${res.status})`);
}
