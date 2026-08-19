/**
 * Configuration for the consent service.
 *
 * `fromEnv()` builds a Config from the process environment; `config` is the
 * memoized instance the server uses. Import this only from server code
 * (route handlers, server components, server actions) — it reads process.env.
 *
 * Peer convention mirrors the AS/auth-ui interaction protocol: our own identity
 * is our base URL; the AS peer's identity and JWKS derive from ITS base URL.
 */

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.length === 0) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function optional(name: string, fallback: string): string {
  const v = process.env[name];
  return v && v.length > 0 ? v : fallback;
}

export interface Config {
  databaseUrl: string;
  consentBaseUrl: string;
  asBaseUrl: string;
  asIssuerId: string;
  asJwksUri: string;
  consentIssuerId: string;
  consentSigningJwks: string;
  // The consent service as a first-party OIDC client of the AS. Every signer
  // (incl. the resource owner) proves identity here via an id_token — the one
  // uniform mechanism for single- and multi-signer.
  oidcClientId: string;
  oidcClientSecret: string;
  oidcRedirectUri: string;
  oidcAuthorizeEndpoint: string;
  oidcTokenEndpoint: string;
  oidcJwksUri: string;
  oidcIssuer: string;
}

export function fromEnv(): Config {
  const consentBaseUrl = required("CONSENT_BASE_URL");
  const asBaseUrl = required("AS_BASE_URL");
  return {
    databaseUrl: optional("DATABASE_URL", "file:./data/consent.sqlite"),
    consentBaseUrl,
    asBaseUrl,
    asIssuerId: asBaseUrl,
    asJwksUri: `${asBaseUrl}/.well-known/jwks.json`,
    consentIssuerId: consentBaseUrl,
    consentSigningJwks: optional("CONSENT_SIGNING_JWKS", ""),
    oidcClientId: optional("OIDC_CLIENT_ID", ""),
    oidcClientSecret: optional("OIDC_CLIENT_SECRET", ""),
    oidcRedirectUri: `${consentBaseUrl}/oidc/callback`,
    oidcAuthorizeEndpoint: `${asBaseUrl}/oauth/authorize`,
    oidcTokenEndpoint: `${asBaseUrl}/oauth/token`,
    oidcJwksUri: `${asBaseUrl}/oauth/jwks`,
    // A correctly-provisioned AS uses its own base URL as the OIDC issuer, so the
    // id_token `iss` equals asBaseUrl. (Once the AS discovery doc also carries the
    // right endpoints + jwks_uri, oidc.ts can drop these and just call discovery.)
    oidcIssuer: asBaseUrl,
  };
}

export const config: Config = fromEnv();
