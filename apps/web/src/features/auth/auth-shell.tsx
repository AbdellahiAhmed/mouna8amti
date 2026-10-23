"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { TopoLines } from "@/components/brand/topo-lines";
import { LocaleSwitcher } from "@/components/locale-switcher";

const ease = [0.2, 0, 0, 1] as const;

/** Centred card on the deep-green topographic ground (design › 1 · تسجيل الدخول). */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const t = useTranslations("auth");

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-night px-4 py-14">
      <TopoLines className="pointer-events-none absolute inset-0 size-full" />

      <div className="absolute end-4 top-4 sm:end-6 sm:top-6">
        <LocaleSwitcher className="bg-white/10 [&_button[aria-checked=false]]:text-white/75 [&_button[aria-checked=false]:hover]:text-white" />
      </div>

      <div className="relative flex w-full max-w-[26rem] flex-col items-center gap-6">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>
          <Logo tone="light" className="[&_svg]:size-11 [&>span:last-child]:text-[1.6rem]" />
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 14, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.08, ease }}
          className="w-full rounded-[20px] bg-canvas px-7 pb-7 pt-8 shadow-float sm:px-8"
        >
          <h1 className="text-[1.5rem] leading-snug text-night">{title}</h1>
          <p className="mt-1 text-body text-slate">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </motion.section>

        <p className="text-center text-body text-white/75">{t("tagline")}</p>
      </div>
    </main>
  );
}
