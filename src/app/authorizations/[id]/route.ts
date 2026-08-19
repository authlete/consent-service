/**
 * Consent capture — entry. The AS hands us the browser here with a signed
 * `interaction` token (see the AS INTERACTION_PROTOCOL.md). We verify it, then
 * start the signer's OIDC login against the AS. The PKCE verifier + CSRF state
 * ride in an httpOnly tx cookie, and the target authorization id rides with them
 * so `/oidc/callback` knows which consent to load on return.
 */

import { NextResponse, type NextRequest } from "next/server";
import { config } from "@/lib/config";
import { verifyFromAs } from "@/lib/auth/jwt";
import { beginLogin } from "@/lib/auth/login";
import { setTx } from "@/lib/auth/session";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  let authorizationId: string | undefined;
  try {
    const payload = await verifyFromAs(config, req.nextUrl.searchParams.get("interaction") ?? "");
    authorizationId = typeof payload.authorization === "string" ? payload.authorization : undefined;
  } catch {
    authorizationId = undefined;
  }
  if (!authorizationId || authorizationId !== id) {
    return NextResponse.redirect(new URL("/error?reason=invalid_request", config.consentBaseUrl));
  }

  const { url, txToken } = await beginLogin(config, "capture", { authorizationId });
  await setTx(txToken);
  return NextResponse.redirect(url);
}
