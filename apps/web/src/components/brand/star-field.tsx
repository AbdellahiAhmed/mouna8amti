"use client";

import { motion } from "motion/react";
import { useId } from "react";

const STAR =
  "M50 6L62.89 18.89L81.11 18.89L81.11 37.11L94 50L81.11 62.89L81.11 81.11L62.89 81.11L50 94L37.11 81.11L18.89 81.11L18.89 62.89L6 50L18.89 37.11L18.89 18.89L37.11 18.89Z";

/**
 * Decorative 8-point star lattice for brand surfaces (auth, onboarding, empty
 * states). Faded with a radial mask; one large star turns very slowly.
 */
export function StarField({ className }: { className?: string }) {
  const id = useId();

  return (
    <div aria-hidden="true" className={className}>
      <svg className="absolute inset-0 size-full" style={{ maskImage: "radial-gradient(ellipse at 70% 30%, black, transparent 70%)" }}>
        <defs>
          <pattern id={`${id}-lattice`} width="56" height="56" patternUnits="userSpaceOnUse">
            <path d={STAR} transform="scale(0.56)" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id}-lattice)`} />
      </svg>

      <motion.svg
        viewBox="0 0 100 100"
        className="absolute -end-40 -top-40 size-[34rem] text-gold/15"
        animate={{ rotate: 360 }}
        transition={{ duration: 180, ease: "linear", repeat: Infinity }}
      >
        <path d={STAR} fill="none" stroke="currentColor" strokeWidth="0.4" />
        <path d={STAR} fill="none" stroke="currentColor" strokeWidth="0.4" transform="rotate(22.5 50 50) scale(0.62) translate(30.6 30.6)" />
      </motion.svg>
    </div>
  );
}
