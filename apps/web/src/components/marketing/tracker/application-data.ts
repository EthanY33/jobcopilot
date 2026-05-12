export type ApplicationStatus = "wishlist" | "applied" | "phone" | "onsite" | "offer";

export interface ApplicationPreview {
  id: string;
  status: ApplicationStatus;
  companyInitial: string;
  companyName: string;
  title: string;
  /** CSS gradient string for the avatar tile. */
  avatarGradient: string;
  /** Optional override for the avatar text color (default white). */
  avatarTextColor?: string;
  /** Mono uppercase timestamp text, e.g. "2h ago" or "3d ago". */
  timestamp: string;
  /** True for the Google card in Applied — drives the recent-pulse animation. */
  recent?: boolean;
}

export const APPLICATIONS: ApplicationPreview[] = [
  // Wishlist
  { id: "wishlist-1", status: "wishlist", companyInitial: "A", companyName: "Anthropic",
    title: "Member of Technical Staff, Applied AI",
    avatarGradient: "linear-gradient(135deg, #d97757, #c2410c)", timestamp: "1d ago" },
  { id: "wishlist-2", status: "wishlist", companyInitial: "L", companyName: "Linear",
    title: "Senior Product Engineer",
    avatarGradient: "linear-gradient(135deg, #5e6ad2, #3a3f7a)", timestamp: "2d ago" },
  { id: "wishlist-3", status: "wishlist", companyInitial: "F", companyName: "Figma",
    title: "Design Engineer, Editor Surface",
    avatarGradient: "linear-gradient(135deg, #f24e1e, #a259ff)", timestamp: "3d ago" },

  // Applied
  { id: "applied-1", status: "applied", companyInitial: "G", companyName: "Google",
    title: "Applications Engineer, YouTube Creator Partnerships",
    avatarGradient: "linear-gradient(135deg, #4285f4, #34a853)", timestamp: "2h ago", recent: true },
  { id: "applied-2", status: "applied", companyInitial: "S", companyName: "Stripe",
    title: "Software Engineer, Payments Platform",
    avatarGradient: "linear-gradient(135deg, #635bff, #3a32a3)", timestamp: "1d ago" },
  { id: "applied-3", status: "applied", companyInitial: "V", companyName: "Vercel",
    title: "Full-Stack Engineer, Next.js",
    avatarGradient: "linear-gradient(135deg, #fff, #888)", avatarTextColor: "#000", timestamp: "3d ago" },

  // Phone screen
  { id: "phone-1", status: "phone", companyInitial: "N", companyName: "Notion",
    title: "Product Engineer, AI Surface",
    avatarGradient: "linear-gradient(135deg, #f4f4f8, #aaa)", avatarTextColor: "#000", timestamp: "2d ago" },
  { id: "phone-2", status: "phone", companyInitial: "C", companyName: "Cursor",
    title: "Engineer, Inference Quality",
    avatarGradient: "linear-gradient(135deg, #1a1a1a, #555)", timestamp: "5d ago" },

  // Onsite
  { id: "onsite-1", status: "onsite", companyInitial: "S", companyName: "Supabase",
    title: "Full-Stack Engineer, Auth",
    avatarGradient: "linear-gradient(135deg, #3ecf8e, #1f7a5b)", timestamp: "1w ago" },

  // Offer
  { id: "offer-1", status: "offer", companyInitial: "R", companyName: "Replicate",
    title: "Founding Engineer, Inference",
    avatarGradient: "linear-gradient(135deg, hsl(258 90% 60%), hsl(215 95% 50%))", timestamp: "2w ago" },
];
