"use client";

import { cn } from "@/lib/utils";

interface OrbBackgroundProps {
  className?: string;
  /** "viewport" = fixed to viewport (use once per page); "container" = absolute within parent */
  position?: "viewport" | "container";
}

export function OrbBackground({ className, position = "viewport" }: OrbBackgroundProps) {
  const positionClasses =
    position === "viewport"
      ? "fixed inset-0 -z-10 pointer-events-none"
      : "absolute inset-0 pointer-events-none";

  return (
    <div className={cn(positionClasses, "overflow-hidden motion-reduce:hidden", className)} aria-hidden="true">
      <div
        className="absolute -top-32 -right-24 h-[420px] w-[420px] rounded-full opacity-50"
        style={{
          background: "radial-gradient(closest-side, hsl(var(--brand-violet) / .35), transparent 70%)",
          filter: "blur(40px)",
          animation: "orb-drift-1 24s ease-in-out infinite alternate",
        }}
      />
      <div
        className="absolute -bottom-24 -left-16 h-[300px] w-[300px] rounded-full opacity-40"
        style={{
          background: "radial-gradient(closest-side, hsl(var(--brand-azure) / .3), transparent 70%)",
          filter: "blur(50px)",
          animation: "orb-drift-2 30s ease-in-out infinite alternate",
        }}
      />
      <style>{`
        @keyframes orb-drift-1 {
          0% { transform: translate(0, 0); }
          100% { transform: translate(-40px, 30px); }
        }
        @keyframes orb-drift-2 {
          0% { transform: translate(0, 0); }
          100% { transform: translate(30px, -40px); }
        }
      `}</style>
    </div>
  );
}
