"use client";

/** Approve / decline for a consent capture. Disables both while submitting. */

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { submitConsent } from "@/app/actions";

export function DecisionForm({ clientName }: { clientName: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="space-y-2.5">
      <Button
        className="w-full"
        disabled={pending}
        onClick={() => start(() => submitConsent("approve"))}
      >
        {pending ? <Spinner /> : null}
        Allow {clientName}
      </Button>
      <Button
        variant="outline"
        className="w-full"
        disabled={pending}
        onClick={() => start(() => submitConsent("reject"))}
      >
        Not now
      </Button>
    </div>
  );
}
