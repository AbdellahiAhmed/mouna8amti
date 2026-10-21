"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { StarField } from "@/components/brand/star-field";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { AnimatedNumber } from "@/components/ui/animated-number";

const ease = [0.2, 0, 0, 1] as const;

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section className="flex flex-col px-6 py-8 sm:px-12">
        <header className="flex items-center justify-between gap-4">
          <Logo />
          <LocaleSwitcher />
        </header>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease }}
          className="mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center py-12"
        >
          <h1 className="text-h1 tracking-[-0.5px]">{title}</h1>
          <p className="mt-2 text-body-lg text-slate">{subtitle}</p>
          <div className="mt-10">{children}</div>
        </motion.div>
      </section>

      <BrandPanel />
    </main>
  );
}

function BrandPanel() {
  const t = useTranslations("auth");

  return (
    <aside className="relative hidden overflow-hidden bg-night text-white lg:flex lg:flex-col lg:justify-end lg:p-16">
      <StarField className="absolute inset-0 text-white/[0.06]" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15, ease }}
        className="relative max-w-xl"
      >
        <p className="text-label font-medium text-gold">{t("panelEyebrow")}</p>
        <h2 className="mt-4 text-display-lg tracking-[-0.8px] text-white">{t("panelTitle")}</h2>
        <p className="mt-5 text-body-lg text-white/70">{t("panelBody")}</p>
      </motion.div>

      <motion.figure
        aria-hidden="true"
        initial={{ opacity: 0, y: 32, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 24, delay: 0.45 }}
        className="relative mt-14 w-full max-w-sm rounded-lg bg-canvas p-6 text-charcoal shadow-float"
      >
        <p className="text-caption text-steel">{t("panelCardProject")}</p>
        <p className="mt-1 text-label text-slate">{t("panelCardLabel")}</p>
        <p className="mt-2 font-display text-h1 text-ink">
          <AnimatedNumber value={1_380_000} /> <span className="text-h4 text-steel">MRU</span>
        </p>
        <div className="mt-5 flex h-2 overflow-hidden rounded-full bg-surface-sunken">
          <motion.span
            className="bg-primary"
            initial={{ width: 0 }}
            animate={{ width: "54%" }}
            transition={{ duration: 1.2, delay: 0.7, ease: [0.3, 0, 0, 1.15] }}
          />
          <motion.span
            className="bg-gold"
            initial={{ width: 0 }}
            animate={{ width: "12%" }}
            transition={{ duration: 0.8, delay: 1.5, ease }}
          />
        </div>
      </motion.figure>
    </aside>
  );
}
