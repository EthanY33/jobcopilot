export type ApplicationStatus =
  | "wishlist"
  | "applied"
  | "phone_screen"
  | "onsite"
  | "offer"
  | "rejected"
  | "ghosted";

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "wishlist",
  "applied",
  "phone_screen",
  "onsite",
  "offer",
  "rejected",
  "ghosted",
];

export type AtsSource = "greenhouse" | "lever" | "ashby" | "workday" | "icims" | "manual";

export type MatchTier = "strong_fit" | "possible_fit" | "weak_fit";

export type DraftKind = "cover_letter" | "free_text_answer" | "resume_bullets";

export interface ResumeSection {
  section: string;
  items: string[];
}

export interface Contact {
  name: string;
  role?: string;
  email?: string;
  linkedin?: string;
}

export interface ExtractedJobPosting {
  company: string;
  title: string;
  location: string | null;
  requirements: string[];
  description: string;
  sourceAts: AtsSource;
}
