/**
 * Cookie-backed sessions for the browser flows. All state is a short-lived
 * self-signed JWT (see jwt.ts `signSelf`) held in an httpOnly cookie — there is
 * no server-side session store.
 *
 *   oidc_tx        the in-flight OIDC login (PKCE verifier + CSRF state + flow)
 *   signer_session the authenticated signer, during a consent capture
 *   panel_session  the authenticated resource owner, in the control panel
 *
 * SameSite=Lax so the cookie survives the top-level GET redirect back from the
 * AS after login; Secure follows the deployment scheme.
 */

import { cookies } from "next/headers";
import type { JWTPayload } from "jose";
import { config } from "@/lib/config";
import { signSelf, verifySelf } from "@/lib/auth/jwt";

const TX = "oidc_tx";
const SIGNER = "signer_session";
const PANEL = "panel_session";

const secure = config.consentBaseUrl.startsWith("https://");

function cookieOptions(maxAgeSeconds: number) {
  return { httpOnly: true, sameSite: "lax" as const, secure, path: "/", maxAge: maxAgeSeconds };
}

async function setSigned(
  name: string,
  payload: Record<string, unknown>,
  ttlSeconds: number,
): Promise<void> {
  const token = await signSelf(config, payload, ttlSeconds);
  (await cookies()).set(name, token, cookieOptions(ttlSeconds));
}

async function readSigned(name: string): Promise<JWTPayload | null> {
  const token = (await cookies()).get(name)?.value;
  if (!token) return null;
  try {
    return await verifySelf(config, token);
  } catch {
    return null;
  }
}

async function clear(name: string): Promise<void> {
  (await cookies()).delete({ name, path: "/" });
}

// --- OIDC transaction --------------------------------------------------------

export async function setTx(token: string): Promise<void> {
  (await cookies()).set(TX, token, cookieOptions(600));
}
export async function readTxToken(): Promise<string | null> {
  return (await cookies()).get(TX)?.value ?? null;
}
export async function clearTx(): Promise<void> {
  await clear(TX);
}

// --- signer session (consent capture) ---------------------------------------

export type SignerSession = { authorizationId: string; signerSub: string; acr?: string };

export async function setSignerSession(s: SignerSession): Promise<void> {
  await setSigned(SIGNER, { ...s }, 900);
}
export async function readSignerSession(): Promise<SignerSession | null> {
  const p = await readSigned(SIGNER);
  if (!p || typeof p.authorizationId !== "string" || typeof p.signerSub !== "string") return null;
  return {
    authorizationId: p.authorizationId,
    signerSub: p.signerSub,
    acr: typeof p.acr === "string" ? p.acr : undefined,
  };
}
export async function clearSignerSession(): Promise<void> {
  await clear(SIGNER);
}

// --- panel session (control panel) ------------------------------------------

export type PanelSession = { sub: string; acr?: string; name?: string; email?: string };

export async function setPanelSession(s: PanelSession): Promise<void> {
  // Carry the user id as `usr`, not `sub`: signSelf sets the JWT subject to this
  // service's issuer, which would clobber a `sub` payload claim.
  await setSigned(PANEL, { usr: s.sub, acr: s.acr, name: s.name, email: s.email }, 3600);
}
export async function readPanelSession(): Promise<PanelSession | null> {
  const p = await readSigned(PANEL);
  if (!p || typeof p.usr !== "string") return null;
  return {
    sub: p.usr,
    acr: typeof p.acr === "string" ? p.acr : undefined,
    name: typeof p.name === "string" ? p.name : undefined,
    email: typeof p.email === "string" ? p.email : undefined,
  };
}
export async function clearPanelSession(): Promise<void> {
  await clear(PANEL);
}
