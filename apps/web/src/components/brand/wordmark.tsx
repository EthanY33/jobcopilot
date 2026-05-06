import { cn } from "@/lib/utils";

interface WordmarkProps {
  size?: number;
  className?: string;
}

export function Wordmark({ size = 24, className }: WordmarkProps) {
  return (
    <span
      className={cn("inline-flex font-display font-bold leading-none", className)}
      style={{ fontSize: size, letterSpacing: "-0.025em" }}
    >
      <span>job</span>
      <span
        className="bg-clip-text text-transparent"
        style={{ backgroundImage: "var(--gradient-brand)" }}
      >
        copilot
      </span>
    </span>
  );
}
