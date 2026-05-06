import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 32, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label="JobCopilot logo"
      className={cn("inline-block", className)}
    >
      <defs>
        <linearGradient id="brand-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(var(--brand-violet))" />
          <stop offset="100%" stopColor="hsl(var(--brand-azure))" />
        </linearGradient>
        <mask id="brand-mask">
          <rect x="0" y="0" width="120" height="120" rx="26" fill="#fff" />
          <g transform="rotate(-22 60 60)">
            <ellipse cx="60" cy="60" rx="34" ry="10" fill="none" stroke="#000" strokeWidth="3.5" />
            <circle cx="26" cy="60" r="10" fill="#000" />
            <circle cx="94" cy="60" r="10" fill="#000" />
          </g>
        </mask>
      </defs>
      <rect x="0" y="0" width="120" height="120" rx="26" fill="url(#brand-grad)" mask="url(#brand-mask)" />
    </svg>
  );
}
