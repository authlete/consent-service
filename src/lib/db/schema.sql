-- Consent service system-of-record (CONSENT-SERVICE-V1.md §6).
-- Minimal and boring; JSON columns for the RAR payload rather than shredding it.
-- The schema carries N-of-M (signer table, required_signers) from day one so
-- joint action is additive; V1 writes exactly one signer.

-- One row per consent request.
CREATE TABLE IF NOT EXISTS consent (
  id                    TEXT PRIMARY KEY,        -- local id
  authorization_id      TEXT NOT NULL UNIQUE,    -- Authlete ticket, correlation during the flow
  grant_id              TEXT,                    -- null until Authorized (linked after issue)
  client_id             TEXT NOT NULL,
  client_name           TEXT,
  subject               TEXT NOT NULL,           -- resource owner (single OAuth subject; §2.1)
  status                TEXT NOT NULL,           -- Pending|Authorized|Rejected|Revoked|Expired
  purpose               TEXT,
  scopes                TEXT,                    -- JSON [{name,description}] for the consent screen
  authorization_details TEXT,                    -- JSON, the granted RAR (RFC 9396 elements)
  valid_from            TEXT,
  valid_to              TEXT,
  frequency             TEXT,
  recurring             INTEGER NOT NULL DEFAULT 0,
  required_signers      INTEGER NOT NULL DEFAULT 1,  -- m of the m-of-N policy (N=1 in V1)
  created_at            TEXT NOT NULL,
  status_updated_at     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_consent_subject ON consent (subject);
CREATE INDEX IF NOT EXISTS idx_consent_grant ON consent (grant_id);

-- 0..n signers per consent (joint action). V1 writes exactly one.
CREATE TABLE IF NOT EXISTS signer (
  id         TEXT PRIMARY KEY,
  consent_id TEXT NOT NULL REFERENCES consent (id),
  subject    TEXT NOT NULL,          -- from the signer's id_token `sub`
  decision   TEXT NOT NULL,          -- approved|rejected
  acr        TEXT,
  decided_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_signer_consent ON signer (consent_id);

-- WORM audit trail (append-only, >=5-year retention). Source for /grants/history,
-- the panel, and outbound webhooks.
CREATE TABLE IF NOT EXISTS consent_event (
  id             TEXT PRIMARY KEY,
  consent_id     TEXT NOT NULL REFERENCES consent (id),
  type           TEXT NOT NULL,      -- sfa.consent.* (semantic event type)
  previous_state TEXT,
  new_state      TEXT NOT NULL,
  reason         TEXT,
  actor_subject  TEXT,
  at             TEXT NOT NULL,
  sequence       INTEGER NOT NULL,   -- per-consent monotonic
  stream_id      TEXT NOT NULL       -- = consent_id (event stream key)
);

CREATE INDEX IF NOT EXISTS idx_event_consent ON consent_event (consent_id, sequence);

-- Pending webhook deliveries (CloudEvents envelope + delivery state). Drained by
-- the worker (step 5). Present in the schema now so emission is additive.
CREATE TABLE IF NOT EXISTS outbox (
  id           TEXT PRIMARY KEY,
  consent_id   TEXT NOT NULL,
  envelope     TEXT NOT NULL,        -- JSON CloudEvents 1.0
  status       TEXT NOT NULL DEFAULT 'pending',  -- pending|delivered|failed
  attempts     INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TEXT,
  created_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox (status, next_attempt_at);
