"use client";

/**
 * Withdraw a permission. A confirmation guards the action (it's consequential and
 * takes effect immediately). The panel asks the AS to revoke the tokens, then
 * records Revoked in the system-of-record.
 */

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Ban } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { revokeConsent } from "@/app/actions";

export function RevokeButton({ consentId, appName }: { consentId: string; appName: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function withdraw() {
    start(async () => {
      try {
        await revokeConsent(consentId);
        toast.success("Access withdrawn");
        setOpen(false);
      } catch {
        toast.error("Couldn’t withdraw access. Please try again.");
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button variant="outline" className="text-destructive">
            <Ban />
            Withdraw access
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Withdraw {appName}’s access?</AlertDialogTitle>
          <AlertDialogDescription>
            {appName} will immediately lose access to the data covered by this permission. This
            can’t be undone — the app would have to request access again.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep access</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:text-white dark:hover:bg-red-700"
            disabled={pending}
            onClick={(e) => {
              e.preventDefault(); // don't auto-close; we close on success
              withdraw();
            }}
          >
            {pending ? <Spinner /> : null}
            Withdraw access
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
