#!/usr/bin/env node
// Applies supabase/policies.sql via the `pg` library.
// Reads DIRECT_URL from the environment. No psql install required.
//
// TLS: the server certificate is verified. Supabase's database CA is not in
// Node's default trust store, so download the CA certificate from the project's
// database settings and set DB_SSL_CA_FILE to its path. To skip verification
// for a one-off run, set APPLY_POLICIES_INSECURE_TLS=1 (not recommended).

import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import pg from "pg";

export function buildSslConfig(env) {
  if (env.APPLY_POLICIES_INSECURE_TLS === "1") {
    return { rejectUnauthorized: false };
  }
  const ssl = { rejectUnauthorized: true };
  if (env.DB_SSL_CA_FILE) {
    ssl.ca = readFileSync(env.DB_SSL_CA_FILE, "utf8");
  }
  return ssl;
}

async function main() {
  const url = process.env.DIRECT_URL;
  if (!url) {
    console.error("DIRECT_URL is not set. Add it to .env before running apply:policies.");
    process.exit(1);
  }

  const here = dirname(fileURLToPath(import.meta.url));
  const sqlPath = resolve(here, "..", "supabase", "policies.sql");
  const sql = readFileSync(sqlPath, "utf8");

  let client;
  try {
    client = new pg.Client({
      connectionString: url,
      ssl: buildSslConfig(process.env),
    });
  } catch (err) {
    console.error("Cannot read DB_SSL_CA_FILE:", err.message);
    process.exit(1);
  }

  try {
    await client.connect();
    await client.query(sql);
    console.log("Policies applied successfully.");
  } catch (err) {
    console.error("Failed to apply policies:", err.message);
    if (/certificate|self.signed|SELF_SIGNED/i.test(err.message)) {
      console.error(
        "TLS verification failed. Set DB_SSL_CA_FILE to the Supabase CA certificate file (see the header of this script).",
      );
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main();
}
