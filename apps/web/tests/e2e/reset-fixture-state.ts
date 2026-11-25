import { prisma } from "@jobcopilot/db";

/**
 * Removes the e2e user's applications (drafts cascade) and the fixture job
 * posting so the next run takes the scrape, extract and draft paths instead of
 * the dedupe and pre-filled-editor shortcuts.
 */
export async function resetFixtureState(email: string, fixtureUrl: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    await prisma.application.deleteMany({ where: { userId: user.id } });
  }
  await prisma.jobPosting.deleteMany({
    where: { sourceUrl: fixtureUrl, applications: { none: {} } },
  });
}
