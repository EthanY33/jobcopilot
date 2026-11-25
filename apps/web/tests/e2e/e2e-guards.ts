/**
 * Pure helpers shared by the Playwright config, the auth setup and the unit
 * tests. Kept free of Playwright and Prisma imports so vitest can load it.
 */

// The e2e suite owns this port so it never attaches to a developer's own
// `pnpm dev` server (which would not have the Anthropic mock env applied).
export const E2E_PORT = 3100;
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;
export const E2E_EMAIL = "e2e@jobcopilot.test";
export const E2E_FIXTURE_URL = `${E2E_BASE_URL}/api/test-mock/google-fixture`;

export function isLocalSupabaseUrl(rawUrl: string): boolean {
  let host: string;
  try {
    host = new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return false;
  }
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host === "::1" ||
    host.endsWith(".localhost")
  );
}

/**
 * Decides whether auth.setup may plant the e2e account (service-role create or
 * password reset) and returns the password to use. The password has no
 * committed default. A non-local Supabase project needs an explicit opt-in.
 */
export function resolveE2eAccount(env: Record<string, string | undefined>): {
  email: string;
  password: string;
} {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required for the e2e setup");
  }
  const password = env.E2E_PASSWORD;
  if (!password || password.length < 12) {
    throw new Error(
      "Set E2E_PASSWORD (at least 12 characters) in your shell or .env. There is no committed default.",
    );
  }
  if (!isLocalSupabaseUrl(url) && env.E2E_ALLOW_REMOTE_SUPABASE !== "1") {
    throw new Error(
      "Refusing to plant the e2e account in a non-local Supabase project. " +
        "Set E2E_ALLOW_REMOTE_SUPABASE=1 only for a dedicated dev project, never production.",
    );
  }
  return { email: E2E_EMAIL, password };
}
