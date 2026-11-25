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

// stripSslParams is a deny-list. This check fails closed behind it: pg keeps the
// ssl object by reference unless the connection string replaced it (a bare "ssl"
// flag, a percent-encoded parameter name, or a parameter a later pg adds).
export function createClient(pg, url, ssl) {
  const client = new pg.Client({ connectionString: stripSslParams(url), ssl });
  if (client.ssl !== ssl) {
    throw new Error(
      "it contains an option that changes the TLS settings. Remove it; DB_SSL_CA_FILE and APPLY_POLICIES_INSECURE_TLS control TLS.",
    );
  }
  return client;
}
