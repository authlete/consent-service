/**
 * Consent capture — the decision screen. The signer (authenticated via OIDC, id
 * verified) reviews exactly what the app is asking for and allows or declines.
 * Disclosures follow the SFA consent duties: who is asking, what data, what
 * purpose, for how long, and the right to withdraw.
 */

import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { SplitLayout } from "@/components/layout/split-layout";
import { BrandMark } from "@/components/layout/brand-mark";
import { activeBrand } from "@/brand/brand";
import { DataAccess } from "@/components/consent/data-access";
import { DecisionForm } from "@/components/consent/decision-form";
import { config } from "@/lib/config";
import { readSignerSession } from "@/lib/auth/session";
import { getByAuthorizationId } from "@/lib/consent/store";
import { appDisplayName } from "@/lib/consent/summary";

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await readSignerSession();
  if (!session || session.authorizationId !== id) redirect("/error?reason=expired");

  const consent = await getByAuthorizationId(config, session.authorizationId);
  if (!consent) redirect("/error?reason=not_found");

  const clientName = appDisplayName(consent);
  const decided = consent.status !== "Pending";

  return (
    <SplitLayout>
      <div className="space-y-6">
        <header className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium lg:hidden">
            <BrandMark />
            <span>{activeBrand.productName}</span>
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold tracking-tight">
              {clientName} is requesting access
            </h1>
            <p className="text-sm text-muted-foreground">
              Review what you’ll be sharing before you allow it.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            <ShieldCheck
              className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
              aria-hidden
            />
            <span>Signed in and identity verified</span>
          </div>
        </header>

        {consent.purpose ? (
          <p className="rounded-lg border-l-2 border-primary/40 bg-muted/40 px-3 py-2 text-sm">
            <span className="font-medium">Purpose · </span>
            {consent.purpose}
          </p>
        ) : null}

        <DataAccess scopes={consent.scopes} details={consent.authorization_details} />

        {decided ? (
          <p className="rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
            This request has already been handled ({consent.status.toLowerCase()}). You can close
            this window.
          </p>
        ) : (
          <>
            <DecisionForm clientName={clientName} />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Your data will be shared only for the purpose and period shown. You can withdraw this
              permission at any time from your consent control panel.
            </p>
          </>
        )}
      </div>
    </SplitLayout>
  );
}
