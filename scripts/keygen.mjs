#!/usr/bin/env node
/**
 * Generate the consent service's signing key (ES256), used to sign the resume
 * verdict token the AS verifies.
 *
 *   npm run keygen              # copy the line into .env or the deploy env UI
 *   npm run keygen >> .env      # append it directly
 *
 * (`npm run setup` calls this automatically for a fresh .env.)
 */

import { generateKeyPair, exportJWK, calculateJwkThumbprint } from "jose";
import { pathToFileURL } from "node:url";

export async function generateJwks() {
  const { privateKey } = await generateKeyPair("ES256", { extractable: true });
  const jwk = await exportJWK(privateKey);
  jwk.kid = await calculateJwkThumbprint(jwk);
  jwk.alg = "ES256";
  jwk.use = "sig";
  return JSON.stringify({ keys: [jwk] });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.error("New ES256 signing key (private — keep it secret):\n");
  console.log(`CONSENT_SIGNING_JWKS=${await generateJwks()}`);
  console.error("\nThe public half is served automatically at /.well-known/jwks.json.");
}
