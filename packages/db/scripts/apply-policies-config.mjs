// Side-effect-free helpers for apply-policies.mjs (importable from tests).

import { readFileSync } from "node:fs";

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

// pg merges parse(connectionString) over the config object, so any ssl option
// in the URL would replace the ssl object built above. Remove them so the
// script's TLS decision is the only one.
const SSL_PARAMS = /^(ssl|sslmode|sslcert|sslkey|sslrootcert|uselibpqcompat)=/i;

export function stripSslParams(connectionString) {
  const q = connectionString.indexOf("?");
  if (q === -1) return connectionString;
  const kept = connectionString
    .slice(q + 1)
    .split("&")
    .filter((pair) => pair !== "" && !SSL_PARAMS.test(pair));
  const head = connectionString.slice(0, q);
  return kept.length ? `${head}?${kept.join("&")}` : head;
}
