"use server";

/**
 * Server actions for the browser flows.
 *
 *   submitConsent   the signer approves/rejects → report the outcome to the AS,
 *                   return the browser to the AS resume endpoint.
 *   startPanelLogin the control panel's "sign in" → begin OIDC login.
 *   panelSignOut    clear the panel session.
 *   revokeConsent   the owner withdraws a consent → the AS revokes the tokens at
 *                   Authlete (subject+client), then the SoR records Revoked.
 */

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { config } from "@/lib/config";
import { beginLogin } from "@/lib/auth/login";
import {
  clearSignerSession,
  readPanelSession,
  readSignerSession,
  setTx,
  clearPanelSession,
} from "@/lib/auth/session";
import {
  getByAuthorizationId,
  getById,
  recordSigner,
  revokeAuthorizedForClient,
  setState,
} from "@/lib/consent/store";
import {
  GrantApiUnsupportedError,
  reportOutcome,
  revokeAuthorization,
  revokeGrantById,
} from "@/lib/as-client";

export async function submitConsent(decision: "approve" | "reject"): Promise<void> {
  const session = await readSignerSession();
  if (!session) redirect("/error?reason=expired");

  const consent = await getByAuthorizationId(config, session.authorizationId);
  if (!consent) redirect("/error?reason=not_found");

  const approve = decision === "approve";
  if (consent.status === "Pending") {
    await recordSigner(config, consent, {
      subject: session.signerSub,
      decision: approve ? "approved" : "rejected",
      acr: session.acr,
    });
  }

  const outcome = approve
    ? { type: "consent", granted_scopes: consent.scopes.map((s) => s.name), consent_id: consent.id }
    : { type: "consent", error: "access_denied" };
  await reportOutcome(config, session.authorizationId, outcome);

  await clearSignerSession();
  redirect(
    `${config.asBaseUrl}/authorizations/${encodeURIComponent(session.authorizationId)}/resume`,
  );
}

export async function startPanelLogin(): Promise<void> {
  const { url, txToken } = await beginLogin(config, "panel");
  await setTx(txToken);
  redirect(url);
}

export async function panelSignOut(): Promise<void> {
  await clearPanelSession();
  redirect("/");
}

export async function revokeConsent(consentId: string): Promise<void> {
  const session = await readPanelSession();
  if (!session) redirect("/error?reason=expired");

  const consent = await getById(config, consentId);
  // Only the owner may withdraw their own consent.
  if (!consent || consent.subject !== session.sub) redirect("/error?reason=not_found");
  if (consent.status !== "Authorized") return; // nothing to withdraw

  if (consent.grant_id) {
    // Preferred: revoke exactly this grant (first-party Grant API), then record
    // just this consent as Revoked. Falls back to client-level if unavailable.
    try {
      await revokeGrantById(config, { subject: session.sub, grantId: consent.grant_id });
      await setState(config, consent, "Revoked", { reason: "revoked", actorSubject: session.sub });
    } catch (err) {
      if (!(err instanceof GrantApiUnsupportedError)) throw err;
      await revokeClientLevel(session.sub, consent.client_id);
    }
  } else {
    // No grant_id (no grant management) — only the client-level lever exists.
    await revokeClientLevel(session.sub, consent.client_id);
  }

  revalidatePath("/");
  revalidatePath(`/consent/${consentId}`);
}

/**
 * Fallback revoke: withdraw the owner's whole authorization for the client at the
 * AS, then mark all of that app's active consents Revoked (mirrors the coarser
 * revocation Authlete performs without the per-grant API).
 */
async function revokeClientLevel(subject: string, clientId: string): Promise<void> {
  await revokeAuthorization(config, { subject, clientId });
  await revokeAuthorizedForClient(config, subject, clientId, subject);
}
