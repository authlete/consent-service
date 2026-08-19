/** A calm, generic error screen for the browser flows (invalid/expired links). */

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/layout/brand-mark";

const MESSAGES: Record<string, string> = {
  invalid_request: "This consent link is invalid.",
  expired: "This link has expired. Please start again from the app.",
  signin_failed: "We couldn’t verify your sign-in. Please try again.",
  load_failed: "We couldn’t load this consent request. Please try again.",
  not_pending: "This consent request is no longer awaiting a decision.",
  not_found: "We couldn’t find that record.",
};

export default async function ErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const message = (reason && MESSAGES[reason]) || "Something went wrong.";
  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm space-y-5 text-center">
        <div className="flex justify-center text-muted-foreground">
          <BrandMark className="size-7" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <AlertCircle className="size-8 text-muted-foreground" aria-hidden />
          <p className="text-sm text-foreground">{message}</p>
        </div>
        <Button
          variant="outline"
          className="w-full"
          render={<Link href="/">Go to your consents</Link>}
        />
      </div>
    </main>
  );
}
