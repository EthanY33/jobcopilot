import { test as setup, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@jobcopilot/db";
import path from "node:path";
import fs from "node:fs";
import { resolveE2eAccount } from "./e2e-guards";
import { loadE2eEnv } from "./load-env";

const authFile = path.join("playwright", ".auth", "user.json");

// Playwright's config already loads the env for every worker; calling it again
// is a no-op for set keys and keeps this file runnable on its own.
loadE2eEnv();

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
