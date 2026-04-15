import { z } from "zod";

export const resumeSectionSchema = z.object({
  section: z.string().min(1),
  items: z.array(z.string()),
});

export const extractedJobPostingSchema = z.object({
  company: z.string().min(1),
  title: z.string().min(1),
  location: z.string().nullable(),
  requirements: z.array(z.string()),
  description: z.string(),
  sourceAts: z.enum(["greenhouse", "lever", "ashby", "workday", "icims", "manual"]),
});

export const draftCoverLetterRequestSchema = z.object({
  applicationId: z.string().uuid(),
  resumeVariantId: z.string().uuid(),
  override: z.string().optional(), // "focus on X"
});

export const draftCoverLetterResponseSchema = z.object({
  draftId: z.string().uuid(),
  version: z.number().int().positive(),
  body: z.string(),
  alternateOpenings: z.array(z.string()).length(3),
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
  url: z.string().url(),
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
