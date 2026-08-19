/** A small, deterministic monogram for a requesting app — a calm stand-in when
 * the client has no logo. Color is derived from the name so it's stable. */

import { cn } from "@/lib/utils";

const PALETTE = [
  "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "bg-teal-500/15 text-teal-700 dark:text-teal-300",
];

export function AppGlyph({ name, className }: { name: string; className?: string }) {
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const color = PALETTE[hash % PALETTE.length];
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold",
        color,
        className,
      )}
      aria-hidden
    >
      {initial}
    </span>
  );
}
