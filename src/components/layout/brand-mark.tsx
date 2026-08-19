/**
 * Brand mark for the top bar and sign-in panel. Renders the configured logo
 * image when set, otherwise a neutral built-in mark drawn in `currentColor` so
 * it adapts to whatever surface (light bar, dark panel) it sits on.
 */

import Image from "next/image";
import { cn } from "@/lib/utils";
import { activeBrand } from "@/brand/brand";

export function BrandMark({ className }: { className?: string }) {
  if (activeBrand.logoMark) {
    return (
      <Image
        src={activeBrand.logoMark}
        alt={activeBrand.productName}
        width={24}
        height={24}
        className={cn("h-6 w-6", className)}
      />
    );
  }
  // Abstract "aurora" mark — rising arcs over a horizon, drawn in currentColor.
  // Reads as dawn/open-finance, institutional, and brand-agnostic; a real
  // deployment replaces it with the institution's logo via `logoMark`.
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={cn("h-6 w-6", className)}>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" fill="currentColor" opacity="0.1" />
      <path
        d="M6 16a6 6 0 0 1 12 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M8.75 16a3.25 3.25 0 0 1 6.5 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.6"
      />
      <line
        x1="4.5"
        y1="16"
        x2="19.5"
        y2="16"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
