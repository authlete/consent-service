/**
 * White-label brand configuration — the single source of truth for every
 * brand-specific value the UI renders: institution name, logo, font, colors,
 * and the sign-in panel copy.
 *
 * The consent service is hosted by the account-provider institution (the IPI/IPC
 * — a bank), so the brand is that institution's. To rebrand: point `activeBrand`
 * at a different preset (or edit one) and drop a logo into /public/brand.
 * Colors flow into CSS variables via `brandCssVars`; nothing else hardcodes a
 * brand value. A different institution can replace this UI wholesale as long as
 * it speaks the same interaction + consent protocol to the AS.
 */

import { aurora } from "./presets/aurora";

/** Brand-carrying colors that differ between light and dark mode. */
export type ColorScheme = {
  /** Primary action color — buttons, links. */
  primary: string;
  primaryForeground: string;
  /** Focus ring. */
  ring: string;
};

export type Brand = {
  /** The institution name — shown in the top bar and the document title. */
  productName: string;
  /** Short product label under the institution name (e.g. "Open Finance"). */
  productTagline: string;
  /** Logo image path under /public. Falls back to a neutral built-in mark. */
  logoMark?: string;
  /** CSS font-family stack applied as --font-sans. */
  fontFamily: string;
  /** Highlight color on the (always-dark) sign-in panel. */
  accent: string;
  light: ColorScheme;
  dark: ColorScheme;
  panel: {
    /** CSS `background` for the sign-in panel — solid color or gradient. */
    background: string;
    headline: string;
    subhead: string;
    bullets: string[];
    footer: string;
  };
};

/** The brand the app renders. Swap this to rebrand. */
export const activeBrand: Brand = aurora;

/**
 * Serializes a brand's tokens into a CSS string for injection at the document
 * root (see layout.tsx). Brand-carrying tokens live here, not in globals.css,
 * so this config stays the single source of truth. Inputs are trusted, in-repo
 * constants — safe to inline into a <style> tag.
 */
export function brandCssVars(b: Brand): string {
  return `
:root {
  --font-sans: ${b.fontFamily};
  --brand-accent: ${b.accent};
  --brand-panel: ${b.panel.background};
  --primary: ${b.light.primary};
  --primary-foreground: ${b.light.primaryForeground};
  --ring: ${b.light.ring};
}
.dark {
  --primary: ${b.dark.primary};
  --primary-foreground: ${b.dark.primaryForeground};
  --ring: ${b.dark.ring};
}`;
}
