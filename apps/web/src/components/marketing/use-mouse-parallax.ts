"use client";

import { useState, useCallback } from "react";

export function useMouseParallax() {
  const [transform, setTransform] = useState<string>("none");

  const onMouseMove = useCallback((event: React.MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    // Normalize cursor position to -0.5..0.5 across both axes.
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    // rotateX(-y * 4deg) rotateY(x * 4deg) per spec §5. ±2deg total.
    setTransform(`perspective(1200px) rotateX(${-(y * 4).toFixed(2)}deg) rotateY(${(x * 4).toFixed(2)}deg)`);
  }, []);

  const onMouseLeave = useCallback(() => {
    setTransform("none");
  }, []);

  return { transform, handlers: { onMouseMove, onMouseLeave } } as const;
}
