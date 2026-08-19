/**
 * Control-panel shell. Unlike a generic account app, a consent panel puts
 * transparency first: the signed-in, verified identity is shown plainly in the
 * header (not hidden behind an avatar menu), next to a clear Sign out. Brand on
 * the left; nothing else competes for attention.
 */

import type { ReactNode } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { activeBrand } from "@/brand/brand";
import { BrandMark } from "./brand-mark";
import { Button } from "@/components/ui/button";
import { panelSignOut } from "@/app/actions";

export function AppShell({ children, identity }: { children: ReactNode; identity?: string }) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium tracking-tight">
            <BrandMark />
            <span>{activeBrand.productName}</span>
            <span className="font-normal text-muted-foreground">
              · {activeBrand.productTagline}
            </span>
          </Link>
          {identity ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-muted-foreground sm:inline">{identity}</span>
              <form action={panelSignOut}>
                <Button type="submit" variant="ghost" size="sm">
                  <LogOut />
                  Sign out
                </Button>
              </form>
            </div>
          ) : null}
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
