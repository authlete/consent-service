/** Small view helpers for the control panel — a one-line access summary and a
 * date+time formatter (the SFA panel must show the time a consent was granted,
 * to disambiguate same-day consents). */

import type { Scope } from "@/lib/consent/store";
import { scopeLabel, typeLabel } from "@/lib/consent/labels";

/** A short, human summary of what a consent covers (data clusters, else scopes). */
export function accessSummary(details: unknown[], scopes: Scope[]): string {
  const types = [
    ...new Set(
      details
        .filter(Boolean)
        .map((d) => (d as Record<string, unknown>).type)
        .filter((t): t is string => typeof t === "string")
        .map((t) => typeLabel(t)),
    ),
  ];
  if (types.length) {
    return types.slice(0, 3).join(", ") + (types.length > 3 ? ` +${types.length - 3}` : "");
  }
  const identity = scopes.map((s) => scopeLabel(s.name)).slice(0, 3);
  return identity.join(", ") || "Account access";
}

/** The app's display name — its registered name, else its id, else a fallback. */
export function appDisplayName(
  consent: { client_name: string | null; client_id: string },
  fallback = "This app",
): string {
  return consent.client_name || consent.client_id || fallback;
}

/** Mask an opaque subject id for display — shows only the last characters. */
export function maskSubject(sub: string): string {
  return sub.length > 6 ? `••••${sub.slice(-6)}` : sub;
}

/** Date + time, e.g. "12 Sep 2026, 14:03". */
export function formatDateTime(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}
