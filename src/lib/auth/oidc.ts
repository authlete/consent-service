/**
 * The consent service as a first-party OIDC client of the AS, via the de-facto
 * `openid-client` library (PKCE, code exchange, and id_token validation are all
 * the library's job — we don't hand-roll crypto). This is how EVERY signer — the
 * resource owner and any later joint-action signer — proves who they are: a
 * standard OIDC login (AS → auth-ui → id_token), from which we read `sub`.
 *
 * We SHOULD use OIDC discovery: `discovery(new URL(asBaseUrl))`. It's disabled
 * only because the AS's Authlete service is currently provisioned with
 * placeholder metadata (issuer `https://authlete.com`, endpoints `https://localhost/*`,
 * no jwks_uri). Once the service issuer/endpoints are set to the AS base URL,
 * replace the explicit `serverMetadata` below with a one-line `discovery()` call
 * and drop `oidcIssuer` from config. Until then we pin the real endpoints + the
 * issuer Authlete actually stamps, so login works against the live AS.
 *
 * The scope is bare `openid` (no RAR, no grant_management), so the AS handles
 * this login inline and never routes it back to us — no recursion.
 */

import * as client from "openid-client";
import type { Config } from "@/lib/config";

let configuration: client.Configuration | undefined;

function oidc(config: Config): client.Configuration {
  if (!configuration) {
    configuration = new client.Configuration(
      {
        issuer: config.oidcIssuer,
        authorization_endpoint: config.oidcAuthorizeEndpoint,
        token_endpoint: config.oidcTokenEndpoint,
        jwks_uri: config.oidcJwksUri,
      },
      config.oidcClientId,
      {},
      client.ClientSecretBasic(config.oidcClientSecret),
    );
    // Dev AS runs on http://localhost — allow the non-HTTPS token/JWKS calls.
    if (!config.asBaseUrl.startsWith("https://")) {
      client.allowInsecureRequests(configuration);
    }
  }
  return configuration;
}

export type AuthStart = { url: string; verifier: string; state: string };

/** Begin an OIDC login: the authorization URL plus the PKCE verifier + state to keep. */
export async function startAuthorization(config: Config): Promise<AuthStart> {
  const verifier = client.randomPKCECodeVerifier();
  const challenge = await client.calculatePKCECodeChallenge(verifier);
  const state = client.randomState();
  const url = client
    .buildAuthorizationUrl(oidc(config), {
      redirect_uri: config.oidcRedirectUri,
      scope: "openid",
      code_challenge: challenge,
      code_challenge_method: "S256",
      state,
    })
    .toString();
  return { url, verifier, state };
}

export type Signer = { sub: string; acr?: string; name?: string; email?: string };

/**
 * Complete the login: exchange the code and validate the id_token (signature,
 * iss, aud, exp — all done by the library), returning the signer's identity.
 */
export async function completeAuthorization(
  config: Config,
  currentUrl: URL,
  verifier: string,
  state: string,
): Promise<Signer> {
  const tokens = await client.authorizationCodeGrant(oidc(config), currentUrl, {
    pkceCodeVerifier: verifier,
    expectedState: state,
  });
  const claims = tokens.claims();
  if (!claims?.sub) throw new Error("id_token missing sub");
  return {
    sub: claims.sub,
    acr: typeof claims.acr === "string" ? claims.acr : undefined,
    name: typeof claims.name === "string" ? claims.name : undefined,
    email: typeof claims.email === "string" ? claims.email : undefined,
  };
}
