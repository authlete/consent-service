/**
 * Consent SoR read API — grant history. The append-only WORM event stream for a
 * grant (requested → authorised → … → revoked/expired), which the SFA audit and
 * regulatory dashboards draw on. Same auth as the grant-detail endpoint.
 */

import { config } from "@/lib/config";
import { requireAsJwt } from "@/lib/auth/guard";
import { getByGrantId, listEvents } from "@/lib/consent/store";

export async function GET(req: Request, ctx: { params: Promise<{ grantId: string }> }) {
  const guard = await requireAsJwt(req);
  if (guard instanceof Response) return guard;

  const { grantId } = await ctx.params;
  const consent = await getByGrantId(config, grantId);
  if (!consent) return Response.json({ error: "not_found" }, { status: 404 });

  const events = await listEvents(config, consent.id);
  return Response.json({
    grant_id: grantId,
    events: events.map((e) => ({
      type: e.type,
      previous_state: e.previous_state,
      new_state: e.new_state,
      reason: e.reason,
      actor_subject: e.actor_subject,
      at: e.at,
      sequence: e.sequence,
    })),
  });
}
