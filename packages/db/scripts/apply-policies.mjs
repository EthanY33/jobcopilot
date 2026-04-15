#!/usr/bin/env node
// Applies supabase/policies.sql via the `pg` library.
// Reads DIRECT_URL from the environment. No psql install required.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import pg from "pg";

const url = process.env.DIRECT_URL;
if (!url) {
  console.error("DIRECT_URL is not set. Add it to .env before running apply:policies.");
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const sqlPath = resolve(here, "..", "supabase", "policies.sql");
const sql = readFileSync(sqlPath, "utf8");

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(sql);
  console.log("Policies applied successfully.");
} catch (err) {
  console.error("Failed to apply policies:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
