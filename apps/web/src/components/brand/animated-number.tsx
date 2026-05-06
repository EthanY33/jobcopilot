"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedNumberProps {
  value: number;
  flagKey: string;
  durationMs?: number;
  className?: string;
}

export function AnimatedNumber({ value, flagKey, durationMs = 1200, className }: AnimatedNumberProps) {
  const [display, setDisplay] = useState<number>(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const seen = window.sessionStorage.getItem(flagKey) === "1";
    if (seen) {
      setDisplay(value);
      return;
    }
    window.sessionStorage.setItem(flagKey, "1");

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }

    const start = performance.now();
    const from = 0;
    const to = value;

    function tick() {
      const elapsed = performance.now() - start;
      const t = Math.max(0, Math.min(1, elapsed / durationMs));
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [value, flagKey, durationMs]);

  return <span className={className}>{display}</span>;
}
