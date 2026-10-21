"use client";

import { AnimatePresence, motion } from "motion/react";

export function FormAlert({ message }: { message: string | null }) {
  return (
    <AnimatePresence>
      {message ? (
        <motion.p
          role="alert"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
          className="overflow-hidden rounded-sm bg-danger-soft px-4 py-3 text-label text-danger"
        >
          {message}
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
}
