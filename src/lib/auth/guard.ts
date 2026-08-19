/**
 * Inbound guard for AS→consent calls: verifies the per-request mutual JWT in the
 * Authorization Bearer header against the AS's published JWKS, and returns the
 * decoded payload — or a `Response` the caller returns verbatim.
 */

import type { JWTPayload } from "jose";
import { config } from "@/lib/config";
import { verifyFromAs } from "@/lib/auth/jwt";

const CHALLENGE = 'Bearer realm="consent-service", error="invalid_token"';

function unauthorized(error: string, description: string): Response {
  return Response.json(
    { error, error_description: description },
    {
      status: 401,
      headers: { "www-authenticate": CHALLENGE },
    },
  );
}

export async function requireAsJwt(req: Request): Promise<{ payload: JWTPayload } | Response> {
  const header = req.headers.get("authorization") ?? "";
  const jwt = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!jwt) return unauthorized("invalid_request", "missing Authorization Bearer JWT");
  try {
    return { payload: await verifyFromAs(config, jwt) };
  } catch (err) {
    return unauthorized("invalid_token", (err as Error).message);
  }
}
