/**
 * Two-column shell: brand panel on the left, content on the right. Used by the
 * consent capture screen. Below `lg` the brand panel collapses and the content
 * takes the full viewport. Panel background, copy, and accent come from the
 * active brand (src/brand).
 */

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { activeBrand } from "@/brand/brand";
import { BrandMark } from "./brand-mark";

export function SplitLayout({ children }: { children: ReactNode }) {
  const b = activeBrand;
  return (
    <div className="grid min-h-svh lg:grid-cols-[1.05fr_1fr]">
      <aside
        className="relative hidden flex-col justify-between p-10 text-white lg:flex"
        style={{ background: b.panel.background }}
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <BrandMark className="h-6 w-6" />
          <span>{b.productName}</span>
          <span className="opacity-60">· {b.productTagline}</span>
        </div>
        <div className="max-w-sm space-y-5">
          <h1 className="text-2xl font-semibold leading-tight">{b.panel.headline}</h1>
          <p className="text-sm text-white/70">{b.panel.subhead}</p>
          {b.panel.bullets.length ? (
            <ul className="space-y-2.5">
              {b.panel.bullets.map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-sm text-white/90">
                  <Check
                    className="mt-0.5 size-4 shrink-0"
                    style={{ color: b.accent }}
                    aria-hidden
                  />
                  {t}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <p className="text-xs text-white/50">{b.panel.footer}</p>
      </aside>
      <main className="flex items-center justify-center bg-background px-6 py-10 sm:px-10">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
