import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "@/components/providers";
import "./globals.css";
import { activeBrand, brandCssVars } from "@/brand/brand";

export const metadata: Metadata = {
  title: `${activeBrand.productName} · Consent Center`,
  description: "Review and manage the permissions you've given to third-party apps.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="font-sans">
      <body className="min-h-svh">
        {/*
          Injects the active brand's colors and font as CSS variables at the
          document root. dangerouslySetInnerHTML is safe here: brandCssVars
          serializes a typed, in-repo Brand constant — never user input.
        */}
        <style dangerouslySetInnerHTML={{ __html: brandCssVars(activeBrand) }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
