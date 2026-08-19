/** libSQL client — one per process, built from DATABASE_URL. */

import { createClient, type Client } from "@libsql/client";
import type { Config } from "@/lib/config";

let client: Client | undefined;

export function db(config: Config): Client {
  if (!client) client = createClient({ url: config.databaseUrl });
  return client;
}
