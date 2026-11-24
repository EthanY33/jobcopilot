"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

interface Props {
  children: React.ReactNode;
}

export function PageTransition({ children }: Props) {
  const pathname = usePathname();
  // Skip the enter animation on the first render (the old initial={false}).
  const first = useRef(true);
  useEffect(() => {
    first.current = false;
  }, []);
  return (
    // Enter-only: an exit phase would keep the old wrapper mounted, and its
    // App Router outlet child renders the incoming page, mounting it twice.
    <motion.div
      key={pathname}
      initial={first.current ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
