/** The consent service's interaction-protocol public keys — the AS verifies our
 * signed calls against this set (mutual JWT), same primitive as AS ↔ auth-ui. */

import { config } from "@/lib/config";
import { getConsentPublicJwks } from "@/lib/auth/jwks";

export function GET() {
  return new Response(JSON.stringify(getConsentPublicJwks(config)), {
    status: 200,
    headers: {
      "content-type": "application/jwk-set+json",
      "cache-control": "public, max-age=300",
    },
  });
}
