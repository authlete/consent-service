/**
 * link-grant — the AS attaches the Authlete grantId after issue. Mutual-JWT;
 * the data is in the AS-signed claims { consent_id, grant_id }. This is the
 * moment a Pending consent becomes Authorized and gains its grant id.
 */

import { config } from "@/lib/config";
import { requireAsJwt } from "@/lib/auth/guard";
import { getById, linkGrant } from "@/lib/consent/store";

export async function POST(req: Request) {
  const guard = await requireAsJwt(req);
  if (guard instanceof Response) return guard;

  const consentId = guard.payload.consent_id as string | undefined;
  const grantId = guard.payload.grant_id as string | undefined;
  if (!consentId || !grantId) {
    return Response.json(
      { error: "invalid_request", error_description: "consent_id/grant_id required" },
      { status: 400 },
    );
  }

  const consent = await getById(config, consentId);
  if (!consent) return Response.json({ error: "not_found" }, { status: 404 });

  const row = await linkGrant(config, consent, grantId);
  return Response.json({ status: row.status, grant_id: row.grant_id });
}
