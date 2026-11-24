// Run with: node --test packages/db/scripts/apply-policies.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildSslConfig } from "./apply-policies.mjs";

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
