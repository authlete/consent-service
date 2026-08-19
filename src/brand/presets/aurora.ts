import type { Brand } from "../brand";

const SYSTEM_SANS =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/**
 * Reference brand for a demo account-provider institution ("Aurora"). A calm,
 * trustworthy financial palette — deep teal-navy primary — that reads as a bank
 * without imitating a real one. Swap or edit to rebrand for a real institution.
 */
export const aurora: Brand = {
  productName: "Aurora",
  productTagline: "Open Finance",
  fontFamily: SYSTEM_SANS,
  accent: "hsl(174 62% 55%)",
  light: {
    primary: "hsl(190 84% 26%)",
    primaryForeground: "hsl(180 40% 98%)",
    ring: "hsl(190 84% 26%)",
  },
  dark: {
    primary: "hsl(174 62% 55%)",
    primaryForeground: "hsl(196 60% 10%)",
    ring: "hsl(174 62% 55%)",
  },
  panel: {
    background: "linear-gradient(150deg, hsl(196 70% 12%) 0%, hsl(190 66% 20%) 100%)",
    headline: "Your data. Your choice.",
    subhead:
      "Review and manage every permission you've given, in one place — as required under Chile's Open Finance System.",
    bullets: [
      "See exactly what each app can access",
      "Withdraw a permission at any time",
      "A complete history of your consents",
    ],
    footer: "Aurora · Open Finance Consent Center",
  },
};
