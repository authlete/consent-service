/**
 * EventSink seam — the one place state changes leave the service. `store`
 * transitions call `sink.emit(event)`; a sink turns the generic event into a
 * CloudEvents envelope and enqueues delivery.
 *
 * The core emits generic `consent.*` types. Mapping to an ecosystem's wire names
 * (e.g. Chile's `cl.sfa.consent.*` per NCG 569 Annex 3) belongs in the delivery
 * adapter, not here — the core stays generic. Today the seam ships with a no-op
 * sink; the outbox writer + worker swap in later without touching the machine.
 */

export type ConsentEvent = {
  type: string; // consent.* (requested|authorised|rejected|revoked|expired)
  consentId: string;
  grantId?: string | null;
  previousState: string | null;
  newState: string;
  reason?: string;
  actorSubject?: string;
};

export interface EventSink {
  emit(event: ConsentEvent): void;
}

/** Default sink until the outbox lands (step 5). */
export const noopSink: EventSink = {
  emit() {},
};
