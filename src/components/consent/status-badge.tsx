/**
 * Consent status pill. The five regulated states, each with a stable, calm
 * semantic color and a leading dot so status reads at a glance and doesn't rely
 * on color alone.
 */

import { cn } from "@/lib/utils";
import type { State } from "@/lib/consent/machine";

const STYLES: Record<State, { dot: string; badge: string }> = {
  Authorized: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  Pending: { dot: "bg-amber-500", badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  Rejected: { dot: "bg-rose-500", badge: "bg-rose-500/10 text-rose-700 dark:text-rose-400" },
  Revoked: { dot: "bg-slate-400", badge: "bg-slate-500/10 text-slate-600 dark:text-slate-400" },
  Expired: { dot: "bg-slate-400", badge: "bg-slate-500/10 text-slate-600 dark:text-slate-400" },
};

export function StatusBadge({ status, className }: { status: State; className?: string }) {
  const s = STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        s.badge,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", s.dot)} aria-hidden />
      {status}
    </span>
  );
}
