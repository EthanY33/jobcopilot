import { Logo } from "./logo";
import { Wordmark } from "./wordmark";
import { cn } from "@/lib/utils";

interface LockupProps {
  logoSize?: number;
  wordSize?: number;
  gap?: number;
  className?: string;
}

export function Lockup({ logoSize = 28, wordSize = 18, gap = 10, className }: LockupProps) {
  return (
    <span className={cn("inline-flex items-center", className)} style={{ gap }}>
      <Logo size={logoSize} />
      <Wordmark size={wordSize} />
    </span>
  );
}
