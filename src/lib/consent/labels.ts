// Copied from auth-ui (canonical SFA consent vocabulary). Promote to a shared package later.
// Consent-screen vocabulary + value formatters — the one place to localize.

type RarElement = Record<string, unknown>;

type ScopeGroupKey = "session" | "consents" | "identity" | "signin" | "other";

const SCOPE_META: Record<string, { label: string; group: ScopeGroupKey; description?: string }> = {
  openid: { label: "Sign you in", group: "signin" },
  profile: { label: "Basic profile", group: "identity" },
  name: { label: "Your name", group: "identity" },
  email: { label: "Email address", group: "identity" },
  address: { label: "Postal address", group: "identity" },
  phone: { label: "Phone number", group: "identity" },
  offline_access: {
    label: "Keep you signed in",
    group: "session",
    description: "Reconnects without asking you each time",
  },
  grant_management_query: { label: "See the permissions you've given it", group: "consents" },
  grant_management_revoke: { label: "Withdraw those permissions anytime", group: "consents" },
};

// Prominence order, most consequential first; unknown scopes sort last.
const SCOPE_ORDER: ScopeGroupKey[] = ["session", "consents", "identity", "signin", "other"];

const TYPE_LABELS: Record<string, string> = {
  Accounts: "Account information",
  Loans: "Loans",
  CreditCardAccounts: "Credit cards",
  Insurances: "Insurance",
  Investments: "Investments",
  Customers: "Your profile",
  Resources: "Available products",
  PaymentReports: "Payment reports",
  FundsConfirmation: "Funds confirmation",
  SinglePayments: "One-time payment",
  ScheduledPayments: "Scheduled payment",
  RecurringPayments: "Recurring payments",
  VariableRecurringPayments: "Variable recurring payments",
};

// Concise noun labels — rendered as capability tags, not sentences.
const ACTION_LABELS: Record<string, string> = {
  ReadAccounts: "Account details",
  ReadAccountsBalance: "Balances",
  ReadAccountsTransactions: "Transactions",
  ReadAccountsOverdraft: "Overdraft",
  ReadAccountsCurrentOverdraftLimit: "Overdraft limit",
  ReadAccountsInsurance: "Linked insurance",
  ReadAccountsInsuranceTransactions: "Insurance transactions",
  ReadCreditCardAccounts: "Card details",
  ReadCreditCardBalance: "Card balance",
  ReadCreditCardCurrentBalance: "Current card balance",
  ReadCreditCardLimit: "Card limit",
  ReadCreditCardTransactions: "Card transactions",
  ReadCustomersPn: "Personal profile",
  ReadCustomersPj: "Business profile",
  ReadLoans: "Loan details",
  ReadLoansBalance: "Loan balances",
  ReadLoansCurrentTransactions: "Loan transactions",
  ReadInvestments: "Investment details",
  ReadInvestmentsBalance: "Investment balances",
  ReadInvestmentsTransactions: "Investment transactions",
  ReadResources: "Available products",
  ReadPaymentReports: "Payment reports",
  ReadSinglePayments: "Payment status",
  ReadTransactions: "Transactions",
  ReadFundsConfirmation: "Funds confirmation",
  CreateSinglePayments: "Initiate payment",
  CreateScheduledPayments: "Schedule payment",
  CreateRecurringPayments: "Recurring payments",
  CreateVariableRecurringPayments: "Variable recurring payments",
  CreateFundsConfirmation: "Confirm funds",
};

const PRIVILEGE_LABELS: Record<string, string> = {
  level1: "Listing",
  level2: "Details",
  level3: "Balances & transactions",
};

const PAYMENT_TYPES = new Set([
  "SinglePayments",
  "ScheduledPayments",
  "RecurringPayments",
  "VariableRecurringPayments",
]);

const DURATION_ADVERB: Record<string, string> = {
  D: "daily",
  W: "weekly",
  M: "monthly",
  Y: "yearly",
};
const DURATION_PLURAL: Record<string, string> = {
  D: "days",
  W: "weeks",
  M: "months",
  Y: "years",
};

/** Split a CamelCase / snake identifier into readable words as a last resort. */
function humanize(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());
}

export const scopeLabel = (name: string): string => SCOPE_META[name]?.label ?? humanize(name);
export const typeLabel = (type: string): string => TYPE_LABELS[type] ?? humanize(type);

export type ScopeView = { name: string; label: string; description?: string };

/** Scopes ordered by prominence (most consequential first), not the order Authlete returned them. */
export function orderedScopes(scopes: { name: string }[]): ScopeView[] {
  const rank = (name: string) => {
    const i = SCOPE_ORDER.indexOf(SCOPE_META[name]?.group ?? "other");
    return i < 0 ? SCOPE_ORDER.length : i;
  };
  return scopes
    .map((s, i) => ({ s, i }))
    .sort((a, b) => rank(a.s.name) - rank(b.s.name) || a.i - b.i)
    .map(({ s }) => ({
      name: s.name,
      label: SCOPE_META[s.name]?.label ?? humanize(s.name),
      description: SCOPE_META[s.name]?.description,
    }));
}
export const actionLabel = (action: string): string => ACTION_LABELS[action] ?? humanize(action);
export const privilegeLabel = (p: string): string => PRIVILEGE_LABELS[p] ?? humanize(p);
export const isPaymentType = (type: string): boolean => PAYMENT_TYPES.has(type);

export function formatDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function formatMoney(amount: unknown): string | null {
  if (!amount || typeof amount !== "object") return null;
  const {
    currency,
    value,
    amount: amt,
  } = amount as {
    currency?: string;
    value?: number | string;
    amount?: number | string;
  };
  const raw = value ?? amt;
  if (raw == null) return null;
  const num = typeof raw === "string" ? Number(raw) : raw;
  if (currency && Number.isFinite(num)) {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(
        num as number,
      );
    } catch {
      /* fall through */
    }
  }
  return `${currency ?? ""} ${raw}`.trim();
}

/** ISO 8601 repeating interval (e.g. "R/2026-09-01T00:00:00Z/P1M") → "monthly". */
export function frequencyPhrase(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const m = value.match(/P(\d+)([DWMY])/);
  const unit = m?.[2];
  if (!m || !unit) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 1) return null;
  if (n === 1) return DURATION_ADVERB[unit] ?? null;
  const plural = DURATION_PLURAL[unit];
  return plural ? `every ${n} ${plural}` : null;
}

/** A short, human validity phrase, folding in recurrence + refresh cadence + expiry. */
export function validityPhrase(el: RarElement): string {
  const to = formatDate(el.validTo);
  const freq = frequencyPhrase(el.frequency);
  if (el.recurringIndicator === true) {
    return [
      "Ongoing access",
      freq ? `, refreshed ${freq}` : "",
      to ? ` until ${to}` : " until you revoke",
    ].join("");
  }
  if (to) return `One-time access until ${to}`;
  return "One-time access";
}

/** A per-payment amount across the shapes used by single vs variable-recurring payments. */
export function paymentAmount(el: RarElement): string | null {
  const instruction = (el.instruction ?? {}) as Record<string, unknown>;
  const policy = (instruction.amountPolicy ?? {}) as Record<string, unknown>;
  const perOccurrence = (policy.perOccurrence ?? {}) as { max?: unknown };
  return (
    formatMoney(instruction.amount) ??
    formatMoney(el.maximumIndividualAmount) ??
    formatMoney(
      perOccurrence.max != null
        ? { currency: policy.currency, value: perOccurrence.max as number }
        : null,
    )
  );
}

// --- consent event history vocabulary (the control-panel timeline) ----------

const EVENT_LABELS: Record<string, string> = {
  "consent.requested": "Requested",
  "consent.authorised": "Authorized",
  "consent.rejected": "Rejected",
  "consent.revoked": "Withdrawn",
  "consent.expired": "Expired",
};

const EVENT_REASONS: Record<string, string> = {
  grant_linked: "linked to the app",
  policy_satisfied: "approved by the required signers",
  signer_rejected: "declined by a signer",
  revoked: "withdrawn by you",
  expired: "validity period ended",
};

export const eventLabel = (type: string, newState: string): string =>
  EVENT_LABELS[type] ?? newState;
export const eventReason = (reason: string | null): string | undefined =>
  reason ? EVENT_REASONS[reason] : undefined;
