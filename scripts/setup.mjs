#!/usr/bin/env node
/**
 * One-shot local setup: creates .env from .env.example, fills the signing key,
 * and creates the SQLite schema. Idempotent — existing values are never
 * overwritten.
 *
 *   npm install && npm run setup && npm run dev
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@libsql/client";
import { generateJwks } from "./keygen.mjs";

const log = (msg) => console.log(`setup: ${msg}`);

if (!existsSync(".env")) {
  copyFileSync(".env.example", ".env");
  log("created .env from .env.example");
} else {
  log(".env already exists — filling blanks only");
}

let env = readFileSync(".env", "utf-8");

function fill(name, value, description) {
  const blank = new RegExp(`^${name}=\\s*$`, "m");
  if (blank.test(env)) {
    env = env.replace(blank, `${name}=${value}`);
    log(`generated ${name} (${description})`);
  }
}

fill("CONSENT_SIGNING_JWKS", await generateJwks(), "ES256 signing key");
writeFileSync(".env", env);

const envText = readFileSync(".env", "utf-8");
const url =
  (envText.match(/^DATABASE_URL=(.*)$/m)?.[1] ?? "").trim() || "file:./data/consent.sqlite";
const authToken = (envText.match(/^DATABASE_AUTH_TOKEN=(.*)$/m)?.[1] ?? "").trim();
if (url.startsWith("file:")) mkdirSync("data", { recursive: true });

const schema = readFileSync(new URL("../src/lib/db/schema.sql", import.meta.url), "utf-8");
const db = createClient({ url, authToken: authToken || undefined });
await db.executeMultiple(schema);
log(`migrated schema → ${url}`);
log("done — `npm run dev` to start");
