/** The consent's WORM event history — the audit trail the SFA panel must show
 * (all states, incl. requested/rejected). Read-only, oldest → newest. Copy comes
 * from the consent vocabulary in `labels`. */

import type { ConsentEventRow } from "@/lib/consent/store";
import { eventLabel, eventReason } from "@/lib/consent/labels";
import { formatDateTime } from "@/lib/consent/summary";

export function HistoryTimeline({ events }: { events: ConsentEventRow[] }) {
  if (!events.length) return null;
  return (
    <ol className="space-y-3">
      {events.map((e, i) => {
        const last = i === events.length - 1;
        const reason = eventReason(e.reason);
        return (
          <li key={e.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="mt-1 size-2 rounded-full bg-primary/60" aria-hidden />
              {!last ? <span className="w-px flex-1 bg-border" aria-hidden /> : null}
            </div>
            <div className="pb-1">
              <p className="text-sm font-medium">{eventLabel(e.type, e.new_state)}</p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(e.at)}
                {reason ? ` · ${reason}` : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
