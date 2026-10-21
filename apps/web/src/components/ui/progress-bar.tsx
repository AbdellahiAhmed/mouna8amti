"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/cn";

/** Fills from the reading-start edge when it enters the viewport (DESIGN.md › Motion › Budget bar). */
export function ProgressBar({ value, label, className }: { value: number; label: string; className?: string }) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-2 overflow-hidden rounded-full bg-surface-sunken", className)}
    >
      <motion.div
        className={cn("h-full rounded-full", clamped === 100 ? "bg-success" : "bg-primary")}
        initial={{ width: 0 }}
        whileInView={{ width: `${clamped}%` }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, ease: [0.3, 0, 0, 1.15] }}
      />
    </div>
  );
}
