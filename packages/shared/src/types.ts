import type { z } from "zod";
import type { atsSourceSchema } from "./schemas";

export type ApplicationStatus =
  | "wishlist"
  | "applied"
  | "phone_screen"
  | "onsite"
  | "offer"
  | "rejected"
  | "ghosted";

export const APPLICATION_STATUSES = [
  "wishlist",
  "applied",
  "phone_screen",
  "onsite",
  "offer",
  "rejected",
  "ghosted",
] as const satisfies readonly ApplicationStatus[];

export type AtsSource = z.infer<typeof atsSourceSchema>;

export type MatchTier = "strong_fit" | "possible_fit" | "weak_fit";

export type DraftKind = "cover_letter" | "free_text_answer" | "resume_bullets";

export interface ResumeSection {
  section: string;
  items: string[];
}

export interface Contact {
  name: string;
  role?: string | undefined;
  email?: string | undefined;
  linkedin?: string | undefined;
}

export interface ExtractedJobPosting {
  company: string;
  title: string;
  location: string | null;
  requirements: string[];
  description: string;
  sourceAts: AtsSource;
}
