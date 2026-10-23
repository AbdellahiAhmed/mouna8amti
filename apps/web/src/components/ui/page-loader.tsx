"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { LogoMark } from "@/components/brand/logo";

export function PageLoader() {
  const t = useTranslations("common");

  return (
    <div role="status" className="grid min-h-dvh place-items-center">
      <motion.div
        animate={{ opacity: [0.35, 1, 0.35], scale: [0.96, 1, 0.96] }}
        transition={{ duration: 1.6, ease: [0.2, 0, 0, 1], repeat: Infinity }}
      >
        <LogoMark className="size-12" />
      </motion.div>
      <span className="sr-only">{t("loading")}</span>
    </div>
  );
}
