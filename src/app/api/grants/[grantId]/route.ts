/**
 * Consent SoR read API — grant detail. The system-of-record projection of a
 * consent, keyed by the Authlete grantId, for ecosystem consumers (the AS, and
 * — in production, over mTLS + FAPI — data holders / TPPs / the regulator).
 *
 * Authenticated with the mutual-JWT primitive today; a real deployment would
 * add mTLS client auth and finer, party-scoped authorization.
 */

import { config } from "@/lib/config";
import { requireAsJwt } from "@/lib/auth/guard";
import { getByGrantId, listSigners, type ConsentRow } from "@/lib/consent/store";

function project(c: ConsentRow, signers: Awaited<ReturnType<typeof listSigners>>) {
  return {
    grant_id: c.grant_id,
    status: c.status,
    client_id: c.client_id,
    client_name: c.client_name,
    subject: c.subject,
    purpose: c.purpose,
    scopes: c.scopes,
    authorization_details: c.authorization_details,
    valid_from: c.valid_from,
    valid_to: c.valid_to,
    frequency: c.frequency,
    recurring: c.recurring,
    required_signers: c.required_signers,
    created_at: c.created_at,
    status_updated_at: c.status_updated_at,
    authorised_by: signers.map((s) => ({
      subject: s.subject,
      decision: s.decision,
      acr: s.acr,
      decided_at: s.decided_at,
    })),
  };
}

export async function GET(req: Request, ctx: { params: Promise<{ grantId: string }> }) {
  const guard = await requireAsJwt(req);
  if (guard instanceof Response) return guard;

  const { grantId } = await ctx.params;
  const consent = await getByGrantId(config, grantId);
  if (!consent) return Response.json({ error: "not_found" }, { status: 404 });

  const signers = await listSigners(config, consent.id);
  return Response.json(project(consent, signers));
}
