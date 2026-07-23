"use client";

import { motion, useReducedMotion } from "motion/react";
import { usePathname } from "@/i18n/navigation";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className="w-full h-full min-h-0">{children}</div>;
  }

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1.0] }}
      className="w-full h-full min-h-0"
    >
      {children}
    </motion.div>
  );
}
