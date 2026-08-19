/**
 * Consent state machine (CONSENT-SERVICE-V1.md §5, en/01 §C.4).
 *
 *   request ─▶ Pending ─▶ Authorized ─▶ Revoked
 *                │            └───────▶ Expired
 *                └─▶ Rejected
 *
 * Pending and Rejected produce no grantId; the grantId is linked only on/after
 * the transition into Authorized. Revoked keeps the grantId for traceability.
 */

export type State = "Pending" | "Authorized" | "Rejected" | "Revoked" | "Expired";

export type SignerDecision = "approved" | "rejected";

const ALLOWED: Record<State, State[]> = {
  Pending: ["Authorized", "Rejected"],
  Authorized: ["Revoked", "Expired"],
  Rejected: [],
  Revoked: [],
  Expired: [],
};

/** Whether `from → to` is a legal transition. */
export function canTransition(from: State, to: State): boolean {
  return ALLOWED[from].includes(to);
}

/**
 * Evaluate the m-of-N `authorisedBy` policy against the signer decisions
 * recorded so far. Any rejection is terminal (a single signer denying →
 * Rejected). `Authorized` once approvals meet the threshold; else still
 * `Pending`. V1 runs with requiredSigners = 1, but the evaluator is N-general.
 */
export function evaluatePolicy(
  requiredSigners: number,
  decisions: SignerDecision[],
): "Authorized" | "Rejected" | "Pending" {
  if (decisions.includes("rejected")) return "Rejected";
  const approvals = decisions.filter((d) => d === "approved").length;
  return approvals >= requiredSigners ? "Authorized" : "Pending";
}
