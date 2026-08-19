/**
 * OIDC-login plumbing shared by the browser-facing flows (consent capture and
 * the control panel). Both authenticate the signer as a first-party OIDC client
 * of the AS (via openid-client); they differ only in what the transaction token
 * carries and what they render on return.
 *
 * The transaction token (self-signed, held in an httpOnly cookie — never in the
 * URL) carries the PKCE verifier, the CSRF `state`, and a `flow` discriminator
 * so a single `/oidc/callback` serves both without a session store.
 */

import type { Config } from "@/lib/config";
import { signSelf } from "@/lib/auth/jwt";
import { startAuthorization, completeAuthorization, type Signer } from "@/lib/auth/oidc";

export type LoginFlow = "capture" | "panel";

/** Begin an OIDC login: the redirect URL, and the tx token to store as a cookie. */
export async function beginLogin(
  config: Config,
  flow: LoginFlow,
  extra: Record<string, unknown> = {},
): Promise<{ url: string; txToken: string }> {
  const { url, verifier, state } = await startAuthorization(config);
  const txToken = await signSelf(config, { flow, verifier, state, ...extra });
  return { url, txToken };
}

/** Complete an OIDC login from the callback URL, returning the signer identity. */
export async function completeLogin(
  config: Config,
  currentUrl: URL,
  verifier: string,
  state: string,
): Promise<Signer> {
  return completeAuthorization(config, currentUrl, verifier, state);
}
