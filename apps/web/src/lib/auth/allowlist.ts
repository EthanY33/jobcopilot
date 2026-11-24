// Sign-in allowlist. JobCopilot is a single-tenant tool, so only the emails in
// AUTH_ALLOWED_EMAILS (comma separated, case-insensitive) may use a session.
// The auth callback and the middleware both go through isEmailAllowed.
// Pass an email that Supabase Auth returned (getUser or the code exchange),
// never one read from a cookie.

let warnedUnset = false;

function allowedEmails(): string[] {
  return (process.env.AUTH_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
}

export function isEmailAllowed(email: string | null | undefined): boolean {
  const allowed = allowedEmails();
  if (allowed.length === 0) {
    // Unset or empty: open outside production, closed in production.
    if (process.env.NODE_ENV !== "production") return true;
    if (!warnedUnset) {
      warnedUnset = true;
      console.error(
        "[auth] AUTH_ALLOWED_EMAILS is not set, so every sign-in is denied in production. Set it to a comma-separated list of allowed emails.",
      );
    }
    return false;
  }
  if (!email) return false;
  return allowed.includes(email.trim().toLowerCase());
}
