import { z } from "zod";

export const atsSourceSchema = z.enum([
  "greenhouse",
  "lever",
  "ashby",
  "workday",
  "icims",
  "manual",
]);

export const resumeSectionSchema = z.object({
  section: z.string().min(1),
  items: z.array(z.string()),
});

// The model fills these fields from a third-party page. They are stored and
// later put into drafting prompts, so each one is bounded. The extraction
// prompt states the same limits.
export const extractedJobPostingSchema = z.object({
  company: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  location: z.string().max(200).nullable(),
  requirements: z.array(z.string().max(300)).max(40),
  description: z.string().max(4000),
  sourceAts: atsSourceSchema,
});

export const draftCoverLetterRequestSchema = z.object({
  applicationId: z.string().uuid(),
  resumeVariantId: z.string().uuid(),
  // "focus on X". Goes into the prompt and is stored with the draft, so it is capped.
  override: z.string().max(2000).optional(),
});

export const draftCoverLetterResponseSchema = z.object({
  draftId: z.string().uuid(),
  version: z.number().int().positive(),
  body: z.string(),
  alternateOpenings: z.tuple([z.string(), z.string(), z.string()]),
});

export const suggestBulletsRequestSchema = z.object({
  applicationId: z.string().uuid(),
  resumeVariantId: z.string().uuid(),
});

export const suggestBulletsResponseSchema = z.object({
  suggestions: z.array(
    z.object({
      section: z.string(),
      originalBullet: z.string(),
      suggestedBullet: z.string(),
      rationale: z.string(),
    }),
  ),
});

export const addApplicationRequestSchema = z.object({
  // z.string().url() alone accepts spaces and newlines inside the URL. The URL
  // is written into the extraction prompt, where a newline would start a new
  // prompt line, so whitespace and control characters are refused.
  url: z
    .string()
    .trim()
    .max(2048)
    .url()
    .regex(/^[^\s\p{Cc}]+$/u, "URL must not contain whitespace or control characters"),
});

export const addApplicationResponseSchema = z.object({
  applicationId: z.string().uuid(),
  jobPostingId: z.string().uuid(),
  extracted: extractedJobPostingSchema,
});

export const updateApplicationRequestSchema = z.object({
  status: z
    .enum(["wishlist", "applied", "phone_screen", "onsite", "offer", "rejected", "ghosted"])
    .optional(),
  appliedAt: z.string().datetime().nullable().optional(),
  followUpAt: z.string().datetime().nullable().optional(),
  notes: z.string().optional(),
  resumeVariantId: z.string().uuid().nullable().optional(),
});

export const contactSchema = z.object({
  name: z.string().min(1),
  role: z.string().optional(),
  email: z.string().email().optional(),
  linkedin: z.string().url().optional(),
});
