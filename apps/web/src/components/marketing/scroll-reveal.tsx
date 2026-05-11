"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./marketing.module.css";

interface ScrollRevealProps {
  children: ReactNode;
  /** Threshold passed to IntersectionObserver (default 0.15). */
  threshold?: number;
  /** Stagger delay in milliseconds. Default 0. */
  delayMs?: number;
  /** Optional inline className to merge. */
  className?: string;
}

export function ScrollReveal({ children, threshold = 0.15, delayMs = 0, className = "" }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div
      ref={ref}
      className={`${styles.reveal} ${visible ? styles.revealVisible : ""} ${className}`.trim()}
      style={delayMs > 0 ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
