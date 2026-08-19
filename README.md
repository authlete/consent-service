# Consent Service

A reference **consent service** for an open-finance ecosystem: the screen where a
customer authorizes an app, the panel where they review and withdraw what they've
granted, and the system-of-record that keeps the regulated consent object. Generic
patterns, inspired by Chile's Open Finance System (SFA) and ready for it.

## Where it fits

An open-finance deployment is a few cooperating services; this is one of them:

- a **thin Authlete AS** owns the OAuth/OIDC protocol and the grants (tokens);
- **auth-ui** authenticates the user;
- **this service** captures consent and is the consent **system-of-record**.

To the AS it's just a second interaction app (same signed-JWT protocol as auth-ui):
the AS hands it the browser for the `consent` step, it authenticates the signer via
OIDC, records the decision, and reports the outcome back. Separately it owns the
regulated consent object — its lifecycle (Pending → Authorized / Rejected / Revoked
/ Expired), signer tracking, and a WORM audit trail — which the AS keeps in sync as
grants are issued and revoked. Withdrawing a consent calls the AS, which revokes the
grant at Authlete (per-grant when the first-party Grant API is available, else at the
client level) and syncs the record back.

Built on **Next.js · React · Tailwind · libSQL · jose · openid-client** — one app
with a UI face, a service face (interaction + grant lifecycle + a read API for the
ecosystem), and the record. Code is organized under `src/app` (routes), `src/lib`
(domain: consent SoR, auth, config), and `src/components`.

## Quick start

```
npm install
npm run setup     # writes .env, generates the signing key, creates the SQLite schema
npm run dev       # http://localhost:3002
```

Point `AS_BASE_URL` at the paired AS, register a first-party OIDC client on it
(redirect `<CONSENT_BASE_URL>/oidc/callback`, `first_party=true`), and set
`CONSENT_UI_URL` on the AS to this service. Both sides discover each other's public
keys at `/.well-known/jwks.json`.
