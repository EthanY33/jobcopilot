import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

type GlassCardProps = React.ComponentProps<typeof Card>;

export function GlassCard({ className, ...props }: GlassCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border-border/40 bg-card/70 backdrop-blur-md",
        "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px",
        "before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
        className,
      )}
      {...props}
    />
  );
}
