import { test as setup, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@jobcopilot/db";
import path from "node:path";
import fs from "node:fs";
import { resolveE2eAccount } from "./e2e-guards";

const authFile = path.join("playwright", ".auth", "user.json");

/**
 * Minimal .env loader. Playwright's test runner does not auto-load Next.js
 * env files, so the auth setup process won't see SUPABASE_SERVICE_ROLE_KEY
 * unless we forward it manually. We read both apps/web/.env.local (for
 * web-specific overrides) and the workspace-root .env (where the service
 * role key actually lives in this repo). Lines we can't parse are skipped.
 */
function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

// apps/web is the cwd when Playwright runs; root .env is two levels up.
loadEnvFile(path.resolve(process.cwd(), ".env.local"));
loadEnvFile(path.resolve(process.cwd(), "..", "..", ".env"));

setup("authenticate", async ({ page }) => {
  // Throws unless E2E_PASSWORD is set and the Supabase URL is local (or
  // E2E_ALLOW_REMOTE_SUPABASE=1), before anything touches the service key.
  const { email: TEST_EMAIL, password: TEST_PASSWORD } = resolveE2eAccount(process.env);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "auth.setup.ts requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env",
    );
  }

  // Idempotently ensure the seeded user exists with the E2E_PASSWORD value.
  // Updating the password on every run keeps it in sync with the env.
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: existing } = await admin.auth.admin.listUsers();
  const found = existing.users.find((u) => u.email === TEST_EMAIL);
  let userId: string;
  if (found) {
    const { error: updateErr } = await admin.auth.admin.updateUserById(found.id, {
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (updateErr) throw updateErr;
    userId = found.id;
  } else {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (createErr || !created.user) throw createErr ?? new Error("createUser failed");
    userId = created.user.id;
  }

  // Seed prerequisites for the cover-letter draft path: a profile (cached
  // prefix needs baseResumeText/skills/targetRoles) and at least one resume
  // variant (the drafter's variant <select> is empty without one, leaving
  // the Draft button disabled).
  await prisma.profile.upsert({
    where: { userId },
    update: {
      baseResumeText: "Ethan Yucetepe\nNJIT CS, December 2026\nExperience...",
      skills: ["TypeScript", "React", "Node.js", "Anthropic SDK"],
      targetRoles: ["Software Engineer", "Applications Engineer"],
    },
    create: {
      userId,
      baseResumeText: "Ethan Yucetepe\nNJIT CS, December 2026\nExperience...",
      skills: ["TypeScript", "React", "Node.js", "Anthropic SDK"],
      targetRoles: ["Software Engineer", "Applications Engineer"],
    },
  });
  const variantName = "E2E Default";
  const existingVariant = await prisma.resumeVariant.findFirst({
    where: { userId, name: variantName },
  });
  if (!existingVariant) {
    await prisma.resumeVariant.create({
      data: {
        userId,
        name: variantName,
        emphasisKeywords: ["full-stack", "AI tooling"],
        bullets: [
          {
            section: "Experience",
            items: ["Founded goneIdle and shipped TideWane to Steam"],
          },
        ],
      },
    });
  }

  // Drive sign-in via the in-app test endpoint, which uses @supabase/ssr to
  // set the proper session cookie shape (chunked + base64url). Going through
  // the magic-link `action_link` puts tokens in the URL fragment for the
  // implicit flow, but our /api/auth/callback only handles PKCE `?code=`
  // exchanges, so the implicit-flow redirect lands the user back on /login.
  await page.goto("/login");
  const res = await page.request.post("/api/test-mock/sign-in", {
    data: { email: TEST_EMAIL, password: TEST_PASSWORD },
  });
  if (!res.ok()) {
    throw new Error(
      `sign-in failed: ${res.status()} ${await res.text()}`,
    );
  }

  // Verify the cookie carries us through the middleware to a protected page.
  await page.goto("/dashboard");
  await page.waitForURL(/\/dashboard$/, { timeout: 15_000 });
  await expect(page.locator("body")).not.toContainText(/error/i);

  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  await page.context().storageState({ path: authFile });
});
