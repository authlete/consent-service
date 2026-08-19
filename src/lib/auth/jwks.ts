/**
 * JWKS handling: parse this service's private JWKS, produce the public JWKS
 * published at /.well-known/jwks.json, and select the signing key. Mirrors the
 * AS's resolver so both sides of the mutual-JWT hop follow the same rules.
 */

import type { JWK } from "jose";
import type { Config } from "@/lib/config";

export type JWKS = { keys: JWK[] };

const PRIVATE_FIELDS = ["d", "p", "q", "dp", "dq", "qi", "oth", "k"] as const;

export function parseJwks(raw: string): JWKS {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid JWKS env: not JSON (${(err as Error).message})`);
  }
  if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as JWKS).keys)) {
    throw new Error("Invalid JWKS env: missing 'keys' array");
  }
  const { keys } = parsed as JWKS;
  if (keys.length === 0) throw new Error("Invalid JWKS env: 'keys' array is empty");
  return { keys };
}

export function publicJwks(jwks: JWKS): JWKS {
  return {
    keys: jwks.keys.map((k) => {
      const out: Record<string, unknown> = { ...k };
      for (const f of PRIVATE_FIELDS) delete out[f];
      return out as unknown as JWK;
    }),
  };
}

export function resolveSigningKey(jwks: JWKS, alg: string): JWK {
  if (jwks.keys.length === 1) return jwks.keys[0]!;
  return jwks.keys.find((k) => k.alg === alg) ?? jwks.keys[0]!;
}

let cachedPrivate: JWKS | null = null;
let cachedPublic: JWKS | null = null;

export function getConsentPrivateJwks(config: Config): JWKS {
  if (!cachedPrivate) {
    if (!config.consentSigningJwks) throw new Error("CONSENT_SIGNING_JWKS not configured");
    cachedPrivate = parseJwks(config.consentSigningJwks);
  }
  return cachedPrivate;
}

export function getConsentPublicJwks(config: Config): JWKS {
  if (!cachedPublic) {
    cachedPublic = config.consentSigningJwks
      ? publicJwks(getConsentPrivateJwks(config))
      : { keys: [] };
  }
  return cachedPublic;
}
