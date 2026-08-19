/**
 * notify — the AS tells us a grant's lifecycle changed out of band:
 * Revoked (after a Grant Management or panel revoke) or Expired (reconcile).
 * Mutual-JWT; data in the AS-signed claims { grant_id, event }.
 */

import { config } from "@/lib/config";
import { requireAsJwt } from "@/lib/auth/guard";
import { getByGrantId, setState } from "@/lib/consent/store";

const TERMINAL = new Set(["Revoked", "Expired", "Rejected"]);

export async function POST(req: Request) {
  const guard = await requireAsJwt(req);
  if (guard instanceof Response) return guard;

  const grantId = guard.payload.grant_id as string | undefined;
  const event = guard.payload.event as string | undefined;
  const consent = grantId ? await getByGrantId(config, grantId) : null;
  if (!consent) return Response.json({ error: "not_found" }, { status: 404 });

  const target = event === "revoked" ? "Revoked" : event === "expired" ? "Expired" : null;
  if (!target) {
    return Response.json(
      { error: "invalid_request", error_description: "bad event" },
      { status: 400 },
    );
  }

  // Already finalized (e.g. revoked here, then a reconcile sweep reports expired).
  // Idempotent: acknowledge without an illegal transition.
  if (TERMINAL.has(consent.status)) {
    return Response.json({ status: consent.status });
  }

  const row = await setState(config, consent, target, { reason: event });
  return Response.json({ status: row.status });
}
