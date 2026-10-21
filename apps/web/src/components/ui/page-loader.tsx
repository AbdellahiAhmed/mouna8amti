"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { LogoMark } from "@/components/brand/logo";

export function PageLoader() {
  const t = useTranslations("common");

  return (
    <div role="status" className="grid min-h-dvh place-items-center">
      <motion.div
        animate={{ rotate: 45, scale: [1, 0.92, 1] }}
        transition={{ duration: 1.4, ease: [0.2, 0, 0, 1], repeat: Infinity, repeatType: "reverse" }}
      >
        <LogoMark className="size-12" />
      </motion.div>
      <span className="sr-only">{t("loading")}</span>
    </div>
  );
}
