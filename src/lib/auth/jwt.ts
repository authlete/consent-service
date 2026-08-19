/**
 * Mutual-JWT with the AS, mirroring the AS↔auth-ui primitive with the peer set
 * to the AS:
 *
 *   - signToAs:   signs this service's calls TO the AS interaction API (fetch the
 *     interaction, report the outcome, revoke a grant), using CONSENT_SIGNING_JWKS.
 *   - verifyFromAs: verifies JWTs issued by the AS — the entry token that hands us
 *     the browser, and the link-grant / notify pushes — against the AS's JWKS.
 *
 * signSelf/verifySelf mint short-lived self-tokens for the browser hops (OIDC
 * `state`, the signer/panel session) — carried in httpOnly cookies, no session
 * store. Standard envelope (iss/sub/aud/iat/exp/jti); per-call claims are the
 * payload.
 */

import {
  SignJWT,
  jwtVerify,
  createRemoteJWKSet,
  importJWK,
  type JWTPayload,
  type KeyLike,
} from "jose";
import { randomUUID } from "node:crypto";
import type { Config } from "@/lib/config";
import { getConsentPrivateJwks, getConsentPublicJwks, resolveSigningKey } from "@/lib/auth/jwks";

const JWKS_CACHE_MAX_AGE_MS = 5 * 60 * 1000;
const JWKS_COOLDOWN_MS = 30 * 1000;
const DEFAULT_EXP_SECONDS = 60;
const CLOCK_TOLERANCE_SECONDS = 5;
const SIGNING_ALG = "ES256";

type ResolvedSigningKey = { key: KeyLike | Uint8Array; kid: string; alg: string };

let signingKeyPromise: Promise<ResolvedSigningKey> | undefined;
let remoteAsJwks: ReturnType<typeof createRemoteJWKSet> | undefined;

async function getSigningKey(config: Config): Promise<ResolvedSigningKey> {
  if (!signingKeyPromise) {
    signingKeyPromise = (async () => {
      const jwk = resolveSigningKey(getConsentPrivateJwks(config), SIGNING_ALG);
      if (!jwk.kid) throw new Error("consent signing JWK must include a kid");
      const key = await importJWK(jwk, jwk.alg ?? SIGNING_ALG);
      return { key, kid: jwk.kid, alg: jwk.alg ?? SIGNING_ALG };
    })().catch((err) => {
      signingKeyPromise = undefined;
      throw err;
    });
  }
  return signingKeyPromise;
}

function getRemoteAsJwks(config: Config) {
  if (!remoteAsJwks) {
    remoteAsJwks = createRemoteJWKSet(new URL(config.asJwksUri), {
      cacheMaxAge: JWKS_CACHE_MAX_AGE_MS,
      cooldownDuration: JWKS_COOLDOWN_MS,
    });
  }
  return remoteAsJwks;
}

/** Sign a JWT addressed to the AS (audience = the AS issuer id by default). */
export async function signToAs(
  config: Config,
  payload: Record<string, unknown>,
  opts: { expiresInSeconds?: number } = {},
): Promise<string> {
  const { key, kid, alg } = await getSigningKey(config);
  const exp = opts.expiresInSeconds ?? DEFAULT_EXP_SECONDS;
  return new SignJWT(payload)
    .setProtectedHeader({ alg, kid, typ: "JWT" })
    .setIssuer(config.consentIssuerId)
    .setSubject(config.consentIssuerId)
    .setAudience(config.asIssuerId)
    .setIssuedAt()
    .setExpirationTime(`${exp}s`)
    .setJti(randomUUID())
    .sign(key);
}

/** Verify a JWT issued by the AS. Throws on any verification failure. */
export async function verifyFromAs(config: Config, jwt: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(jwt, getRemoteAsJwks(config), {
    issuer: config.asIssuerId,
    audience: config.consentIssuerId,
    clockTolerance: CLOCK_TOLERANCE_SECONDS,
  });
  return payload;
}

// --- self-signed short-lived tokens (OIDC `state`, signer/panel session) ------
// Stateless carriers between the browser hops; signed and verified with this
// service's key so a cookie is enough — no server-side session store.

let selfVerifyKey: Promise<KeyLike | Uint8Array> | undefined;
async function getSelfVerifyKey(config: Config): Promise<KeyLike | Uint8Array> {
  if (!selfVerifyKey) {
    selfVerifyKey = (async () => {
      const jwk = resolveSigningKey(getConsentPublicJwks(config), SIGNING_ALG);
      return importJWK(jwk, jwk.alg ?? SIGNING_ALG);
    })().catch((err) => {
      selfVerifyKey = undefined;
      throw err;
    });
  }
  return selfVerifyKey;
}

export async function signSelf(
  config: Config,
  payload: Record<string, unknown>,
  expiresInSeconds = 300,
): Promise<string> {
  const { key, kid, alg } = await getSigningKey(config);
  return new SignJWT(payload)
    .setProtectedHeader({ alg, kid, typ: "JWT" })
    .setIssuer(config.consentIssuerId)
    .setSubject(config.consentIssuerId)
    .setAudience(config.consentIssuerId)
    .setIssuedAt()
    .setExpirationTime(`${expiresInSeconds}s`)
    .setJti(randomUUID())
    .sign(key);
}

export async function verifySelf(config: Config, jwt: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(jwt, await getSelfVerifyKey(config), {
    issuer: config.consentIssuerId,
    audience: config.consentIssuerId,
    clockTolerance: CLOCK_TOLERANCE_SECONDS,
  });
  return payload;
}
