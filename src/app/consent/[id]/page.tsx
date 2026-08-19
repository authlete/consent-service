/**
 * Grant detail — the drill-down for one consent. Shows who has access, exactly
 * what they can do, the purpose and period, the signers (naturally extending to
 * joint action), the full audit history, and — for an active grant — the option
 * to withdraw it.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { AppGlyph } from "@/components/consent/app-glyph";
import { StatusBadge } from "@/components/consent/status-badge";
import { DataAccess } from "@/components/consent/data-access";
import { HistoryTimeline } from "@/components/consent/history-timeline";
import { RevokeButton } from "@/components/consent/revoke-button";
import { config } from "@/lib/config";
import { readPanelSession } from "@/lib/auth/session";
import { getById, listEvents, listSigners } from "@/lib/consent/store";
import { appDisplayName, formatDateTime, maskSubject } from "@/lib/consent/summary";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** A calm, status-specific note for a consent that can no longer be withdrawn. */
function terminalNote(status: string, appName: string): string {
  switch (status) {
    case "Revoked":
      return `You withdrew this permission — ${appName} no longer has access.`;
    case "Expired":
      return "This permission has expired and is no longer active.";
    case "Rejected":
      return "This request was declined, so no access was granted.";
    case "Pending":
      return "This request is still awaiting a decision.";
    default:
      return "This permission is no longer active.";
  }
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

export default async function ConsentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await readPanelSession();
  if (!session) redirect("/");

  const consent = await getById(config, id);
  if (!consent || consent.subject !== session.sub) redirect("/error?reason=not_found");

  const [signers, events] = await Promise.all([
    listSigners(config, consent.id),
    listEvents(config, consent.id),
  ]);
  const appName = appDisplayName(consent);
  const jointAction = consent.required_signers > 1 || signers.length > 1;
  const canRevoke = consent.status === "Authorized";

  return (
    <AppShell identity={session.name || maskSubject(session.sub)}>
      <div className="space-y-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> All consents
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <AppGlyph name={appName} className="size-11" />
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{appName}</h1>
              <p className="text-sm text-muted-foreground">
                Granted {formatDateTime(consent.created_at)}
              </p>
            </div>
          </div>
          <StatusBadge status={consent.status} className="mt-1" />
        </div>

        <Section title="Overview">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Fact label="Status" value={consent.status} />
            <Fact label="Granted" value={formatDateTime(consent.created_at) ?? "—"} />
            {consent.status_updated_at !== consent.created_at ? (
              <Fact label="Last updated" value={formatDateTime(consent.status_updated_at) ?? "—"} />
            ) : null}
            {consent.valid_to ? (
              <Fact label="Valid until" value={formatDateTime(consent.valid_to) ?? "—"} />
            ) : null}
            {consent.grant_id ? (
              <Fact
                label="Reference"
                value={<span className="font-mono text-xs">{consent.grant_id.slice(0, 12)}…</span>}
              />
            ) : null}
          </dl>
          {consent.purpose ? (
            <p className="border-t pt-3 text-sm">
              <span className="text-muted-foreground">Purpose · </span>
              {consent.purpose}
            </p>
          ) : null}
        </Section>

        <Section title="What this app can access">
          <DataAccess scopes={consent.scopes} details={consent.authorization_details} />
        </Section>

        {jointAction ? (
          <Section
            title={`Signers · ${signers.filter((s) => s.decision === "approved").length} of ${consent.required_signers} approved`}
          >
            <ul className="space-y-2">
              {signers.map((s) => (
                <li key={s.id} className="flex items-center justify-between text-sm">
                  <span className="tabular-nums">{maskSubject(s.subject)}</span>
                  <span className="text-xs text-muted-foreground">
                    {s.decision === "approved" ? "Approved" : "Declined"} ·{" "}
                    {formatDateTime(s.decided_at)}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        <Section title="History">
          <HistoryTimeline events={events} />
        </Section>

        {canRevoke ? (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-destructive/20 bg-destructive/[0.03] p-5">
            <div>
              <p className="text-sm font-medium">Withdraw this permission</p>
              <p className="text-sm text-muted-foreground">
                {appName} will lose access immediately.
              </p>
            </div>
            <RevokeButton consentId={consent.id} appName={appName} />
          </div>
        ) : (
          <p className="rounded-xl bg-muted px-5 py-4 text-sm text-muted-foreground">
            {terminalNote(consent.status, appName)}
          </p>
        )}
      </div>
    </AppShell>
  );
}
