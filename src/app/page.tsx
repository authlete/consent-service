/**
 * Home = the Consent Control Panel. Signed out, it explains itself and offers a
 * sign-in. Signed in, it lists the resource owner's consents grouped by the app
 * that requested them — so multiple grants to one app read as one app with
 * several permissions, each drilling into its own detail + withdraw.
 */

import { AppShell } from "@/components/layout/app-shell";
import { BrandMark } from "@/components/layout/brand-mark";
import { AppGlyph } from "@/components/consent/app-glyph";
import { ConsentRow } from "@/components/consent/consent-row";
import { Button } from "@/components/ui/button";
import { activeBrand } from "@/brand/brand";
import { config } from "@/lib/config";
import { readPanelSession } from "@/lib/auth/session";
import { listBySubject, type ConsentRow as Consent } from "@/lib/consent/store";
import { appDisplayName, maskSubject } from "@/lib/consent/summary";
import { startPanelLogin } from "@/app/actions";

export default async function Home() {
  const session = await readPanelSession();
  if (!session) return <Landing />;

  const consents = await listBySubject(config, session.sub);
  const groups = groupByClient(consents);
  const activeCount = consents.filter((c) => c.status === "Authorized").length;
  const identity = session.name || maskSubject(session.sub);

  return (
    <AppShell identity={identity}>
      <div className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Your consents</h1>
          <p className="text-sm text-muted-foreground">
            The apps connected to your accounts, and the permissions you’ve given them.
            {activeCount > 0 ? (
              <>
                {" "}
                <span className="text-foreground">
                  {activeCount} active permission{activeCount === 1 ? "" : "s"}
                </span>{" "}
                across {groups.length} app{groups.length === 1 ? "" : "s"}.
              </>
            ) : null}
          </p>
        </header>

        {groups.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {groups.map((g) => (
              <AppGroup key={g.clientId} name={g.name} consents={g.consents} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

type Group = { clientId: string; name: string; consents: Consent[] };

function groupByClient(consents: Consent[]): Group[] {
  const map = new Map<string, Group>();
  for (const c of consents) {
    const key = c.client_id || "unknown";
    const g = map.get(key);
    if (g) g.consents.push(c);
    else map.set(key, { clientId: key, name: appDisplayName(c), consents: [c] });
  }
  return [...map.values()];
}

function AppGroup({ name, consents }: { name: string; consents: Consent[] }) {
  const active = consents.filter((c) => c.status === "Authorized").length;
  return (
    <section className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <AppGlyph name={name} />
        <div className="min-w-0">
          <p className="truncate font-medium">{name}</p>
          <p className="text-xs text-muted-foreground">
            {active} active · {consents.length} total
          </p>
        </div>
      </div>
      <div className="divide-y">
        {consents.map((c) => (
          <ConsentRow key={c.id} consent={c} />
        ))}
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed py-16 text-center">
      <p className="text-sm font-medium">No consents yet</p>
      <p className="mt-1 text-sm text-muted-foreground">
        When you allow an app to access your accounts, it will appear here.
      </p>
    </div>
  );
}

function Landing() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BrandMark className="size-6" />
          </span>
          <div className="space-y-1">
            <h1 className="text-lg font-semibold tracking-tight">
              {activeBrand.productName} · Consent Center
            </h1>
            <p className="text-sm text-muted-foreground">
              See every app connected to your accounts and withdraw access at any time.
            </p>
          </div>
        </div>
        <form action={startPanelLogin}>
          <Button type="submit" className="w-full">
            Sign in to continue
          </Button>
        </form>
        <p className="text-xs text-muted-foreground">
          You’ll sign in securely with your {activeBrand.productName} account.
        </p>
      </div>
    </main>
  );
}
