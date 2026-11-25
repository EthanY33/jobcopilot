import { z } from "zod";

// Every job_postings column except raw_html. raw_html holds the full scraped
// page (up to 2 MB) and nothing reads it back, so it must not reach responses.
export const JOB_POSTING_SELECT = {
  id: true,
  sourceUrl: true,
  sourceAts: true,
  company: true,
  title: true,
  location: true,
  requirements: true,
  description: true,
  discoveredAt: true,
  postedAt: true,
} as const;

const uuidSchema = z.string().uuid();

export function isUuid(value: string): boolean {
  return uuidSchema.safeParse(value).success;
}

export function isPrismaError(err: unknown, code: string): boolean {
  return (
    !!err &&
    typeof err === "object" &&
    "code" in err &&
    (err as { code?: string }).code === code
  );
}
