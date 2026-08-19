/** One grant within an app group — a summary line that drills into the detail. */

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/consent/status-badge";
import type { ConsentRow as Consent } from "@/lib/consent/store";
import { accessSummary, formatDateTime } from "@/lib/consent/summary";

export function ConsentRow({ consent }: { consent: Consent }) {
  const granted = formatDateTime(consent.created_at);
  return (
    <Link
      href={`/consent/${consent.id}`}
      className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-muted/50"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {accessSummary(consent.authorization_details, consent.scopes)}
        </p>
        {granted ? <p className="text-xs text-muted-foreground">Granted {granted}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <StatusBadge status={consent.status} />
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
      </div>
    </Link>
  );
}
