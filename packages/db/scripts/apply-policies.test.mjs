// Run with: pnpm -F @jobcopilot/db test
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pg from "pg";
import { buildSslConfig, stripSslParams } from "./apply-policies-config.mjs";

test("verifies the server certificate by default", () => {
  assert.deepEqual(buildSslConfig({}), { rejectUnauthorized: true });
});

test("loads the CA file named by DB_SSL_CA_FILE and still verifies", () => {
  const dir = mkdtempSync(join(tmpdir(), "apply-policies-"));
  const file = join(dir, "ca.crt");
  writeFileSync(file, "PEM-BYTES");
  const ssl = buildSslConfig({ DB_SSL_CA_FILE: file });
  assert.equal(ssl.rejectUnauthorized, true);
  assert.equal(ssl.ca, "PEM-BYTES");
});

test("fails closed when the CA file cannot be read", () => {
  assert.throws(() => buildSslConfig({ DB_SSL_CA_FILE: join(tmpdir(), "no-such-ca.crt") }));
});

test("skips verification only on the explicit opt-out", () => {
  assert.equal(buildSslConfig({ APPLY_POLICIES_INSECURE_TLS: "1" }).rejectUnauthorized, false);
  assert.equal(buildSslConfig({ APPLY_POLICIES_INSECURE_TLS: "true" }).rejectUnauthorized, true);
});

const BASE = "postgresql://postgres:pw%40x@db.example.supabase.co:5432/postgres";
const QUERIES = [
  "",
  "?sslmode=require",
  "?sslmode=verify-full",
  "?sslmode=no-verify",
  "?sslmode=disable",
  "?ssl=true",
  "?uselibpqcompat=true&sslmode=require",
  "?pgbouncer=true&sslmode=require&connect_timeout=10",
];
const ENVS = [{}, { APPLY_POLICIES_INSECURE_TLS: "1" }];

for (const q of QUERIES) {
  for (const env of ENVS) {
    test(`script TLS config wins over DIRECT_URL query "${q}" with env ${JSON.stringify(env)}`, () => {
      const client = new pg.Client({
        connectionString: stripSslParams(BASE + q),
        ssl: buildSslConfig(env),
      });
      assert.deepEqual(client.ssl, buildSslConfig(env));
    });
  }
}

test("stripSslParams keeps unrelated parameters", () => {
  const out = stripSslParams(BASE + "?pgbouncer=true&sslmode=require&connect_timeout=10");
  assert.equal(out, BASE + "?pgbouncer=true&connect_timeout=10");
  const client = new pg.Client({ connectionString: out, ssl: buildSslConfig({}) });
  assert.equal(client.connectionParameters.password, "pw@x");
});

test("stripSslParams returns a URL without a query unchanged", () => {
  assert.equal(stripSslParams(BASE), BASE);
});

test("stripSslParams drops the question mark when only ssl parameters were present", () => {
  assert.equal(stripSslParams(BASE + "?sslmode=require"), BASE);
});
