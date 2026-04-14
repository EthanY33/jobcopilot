#!/usr/bin/env node
// Applies supabase/policies.sql using the psql CLI.
// Reads DIRECT_URL from the environment. Works on Windows, macOS, Linux.

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const url = process.env.DIRECT_URL;
if (!url) {
  console.error("DIRECT_URL is not set. Add it to .env before running apply:policies.");
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const sqlPath = resolve(here, "..", "supabase", "policies.sql");
const sql = readFileSync(sqlPath, "utf8");

const res = spawnSync("psql", [url, "-v", "ON_ERROR_STOP=1"], {
  input: sql,
  stdio: ["pipe", "inherit", "inherit"],
  shell: false,
});

if (res.error && res.error.code === "ENOENT") {
  console.error(
    "psql not found on PATH. Install PostgreSQL client tools (e.g. `winget install PostgreSQL.PostgreSQL` " +
      "on Windows, or use Supabase CLI's bundled psql by adding its bin dir to PATH)."
  );
  process.exit(1);
}
process.exit(res.status ?? 1);
