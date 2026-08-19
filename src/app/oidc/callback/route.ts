/**
 * Shared OIDC callback for both browser flows. The tx cookie tells us which flow
 * (`capture` vs `panel`), carries the PKCE verifier + CSRF state, and (for
 * capture) the authorization id. We complete the login, then:
 *   - capture: load the consent from the AS, open a Pending record against the
 *     signer, and hand off to the review screen;
 *   - panel:   open the control panel for the authenticated resource owner.
 */

import { NextResponse, type NextRequest } from "next/server";
import { config } from "@/lib/config";
import { verifySelf } from "@/lib/auth/jwt";
import { completeLogin } from "@/lib/auth/login";
import { clearTx, readTxToken, setPanelSession, setSignerSession } from "@/lib/auth/session";
import { fetchInteraction } from "@/lib/as-client";
import { createPending, getByAuthorizationId } from "@/lib/consent/store";

function errorRedirect(reason: string) {
  return NextResponse.redirect(new URL(`/error?reason=${reason}`, config.consentBaseUrl));
}

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("error")) return errorRedirect("signin_failed");

  const txToken = await readTxToken();
  await clearTx();
  if (!txToken) return errorRedirect("expired");

  let tx;
  try {
    tx = await verifySelf(config, txToken);
  } catch {
    return errorRedirect("expired");
  }

  const flow = tx.flow;
  const verifier = tx.verifier as string;
  const state = tx.state as string;

  let signer;
  try {
    signer = await completeLogin(config, new URL(req.url), verifier, state);
  } catch (err) {
    console.error("[oidc/callback] sign-in failed:", (err as Error).message);
    return errorRedirect("signin_failed");
  }

  if (flow === "panel") {
    await setPanelSession({
      sub: signer.sub,
      acr: signer.acr,
      name: signer.name,
      email: signer.email,
    });
    return NextResponse.redirect(new URL("/", config.consentBaseUrl));
  }

  // capture flow
  const authorizationId = tx.authorizationId as string;
  let step;
  try {
    step = await fetchInteraction(config, authorizationId);
  } catch {
    return errorRedirect("load_failed");
  }
  if (step.next !== "consent" || !step.consent) return errorRedirect("not_pending");

  const existing = await getByAuthorizationId(config, authorizationId);
  if (!existing) {
    await createPending(config, {
      authorizationId,
      clientId: step.client?.client_id ?? "",
      clientName: step.client?.name,
      subject: signer.sub,
      scopes: [...step.consent.new, ...step.consent.already_granted],
      authorizationDetails: step.consent.authorization_details,
    });
  }

  await setSignerSession({ authorizationId, signerSub: signer.sub, acr: signer.acr });
  return NextResponse.redirect(
    new URL(`/authorizations/${encodeURIComponent(authorizationId)}/review`, config.consentBaseUrl),
  );
}
