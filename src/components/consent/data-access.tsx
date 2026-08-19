/**
 * Humanized rendering of what an app is asking for (or has been granted):
 * the RFC 9396 `authorization_details` as calm, iconed cards, plus any OAuth
 * scopes. All copy comes from the SFA vocabulary in `labels` — never raw JSON.
 * Shared by the consent capture screen and the control-panel detail view.
 */

import {
  ArrowRightLeft,
  BadgeCheck,
  CalendarClock,
  CreditCard,
  FileText,
  Landmark,
  LayoutGrid,
  LineChart,
  ReceiptText,
  Repeat,
  ShieldCheck,
  UserRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Scope } from "@/lib/consent/store";
import {
  actionLabel,
  frequencyPhrase,
  isPaymentType,
  orderedScopes,
  paymentAmount,
  privilegeLabel,
  typeLabel,
  validityPhrase,
} from "@/lib/consent/labels";

type RarElement = Record<string, unknown>;

const TYPE_ICONS: Record<string, LucideIcon> = {
  Accounts: Wallet,
  Loans: Landmark,
  CreditCardAccounts: CreditCard,
  Insurances: ShieldCheck,
  Investments: LineChart,
  Customers: UserRound,
  Resources: LayoutGrid,
  PaymentReports: ReceiptText,
  FundsConfirmation: BadgeCheck,
  SinglePayments: ArrowRightLeft,
  ScheduledPayments: CalendarClock,
  RecurringPayments: Repeat,
  VariableRecurringPayments: Repeat,
};

function RarCard({ el }: { el: RarElement }) {
  const type = String(el.type ?? "");
  const Icon = TYPE_ICONS[type] ?? FileText;
  const actions = Array.isArray(el.actions) ? (el.actions as string[]) : [];
  const privileges = Array.isArray(el.privileges) ? (el.privileges as string[]) : [];
  const purpose = typeof el.purpose === "string" ? el.purpose : null;
  const payment = isPaymentType(type);
  const amount = payment ? paymentAmount(el) : null;
  const freq = frequencyPhrase(el.frequency);

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        payment ? "border-amber-500/30 bg-amber-500/[0.04]" : "bg-card",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md",
            payment
              ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
              : "bg-primary/10 text-primary",
          )}
        >
          <Icon className="size-4.5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium leading-snug">{typeLabel(type)}</h3>
            {amount ? <span className="text-base font-semibold tabular-nums">{amount}</span> : null}
          </div>

          {actions.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {actions.map((a) => (
                <span
                  key={a}
                  className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {actionLabel(a)}
                </span>
              ))}
            </div>
          ) : null}

          {privileges.length && !payment ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {privileges.map(privilegeLabel).join(" · ")}
            </p>
          ) : null}

          <p className="mt-1.5 text-xs text-muted-foreground">
            {validityPhrase(el)}
            {freq && el.recurringIndicator !== true ? ` · ${freq}` : ""}
          </p>

          {purpose ? (
            <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Purpose</span> · {purpose}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ScopeList({ scopes, muted }: { scopes: Scope[]; muted?: boolean }) {
  const ordered = orderedScopes(scopes);
  if (!ordered.length) return null;
  return (
    <ul className={cn("space-y-1.5", muted && "opacity-70")}>
      {ordered.map((s) => (
        <li key={s.name} className="flex items-baseline gap-2 text-sm">
          <span className="text-foreground">{s.label}</span>
          {s.description ? (
            <span className="text-xs text-muted-foreground">— {s.description}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function DataAccess({
  scopes,
  details,
  alreadyGranted,
}: {
  scopes: Scope[];
  details: unknown[];
  /** Optionally shown, de-emphasized, as "you've already allowed this". */
  alreadyGranted?: Scope[];
}) {
  const rar = details.filter(Boolean) as RarElement[];
  return (
    <div className="space-y-5">
      {rar.length ? (
        <section className="space-y-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Data &amp; actions
          </h2>
          <div className="grid gap-2.5">
            {rar.map((el, i) => (
              <RarCard key={i} el={el} />
            ))}
          </div>
        </section>
      ) : null}

      {scopes.length ? (
        <section className="space-y-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Account access
          </h2>
          <ScopeList scopes={scopes} />
        </section>
      ) : null}

      {alreadyGranted?.length ? (
        <section className="space-y-2.5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Already allowed
          </h2>
          <ScopeList scopes={alreadyGranted} muted />
        </section>
      ) : null}
    </div>
  );
}
