"use client";

import { motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { latn } from "@/lib/money";
import type { Expense, ProjectStatus } from "@/lib/types";

// The design's single-colour status system: four shades of the brand green, no red or amber.
const PILL = {
  on: "bg-primary-soft text-primary",
  done: "bg-primary text-on-primary",
  stop: "bg-[#efede8] text-[#55524b] dark:bg-surface-sunken dark:text-slate",
  wait: "bg-canvas text-primary shadow-[inset_0_0_0_1px_#9cc9b6]",
} as const;

export function Pill({ tone, children }: { tone: keyof typeof PILL; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-3 py-0.5 text-caption font-medium", PILL[tone])}>
      {children}
    </span>
  );
}

const PROJECT_TONE: Record<ProjectStatus, keyof typeof PILL> = { active: "on", closed: "done", on_hold: "stop", draft: "wait" };

export function ProjectPill({ status }: { status: ProjectStatus }) {
  const t = useTranslations("finance.projectStatus");
  return <Pill tone={PROJECT_TONE[status]}>{t(status)}</Pill>;
}

/** "Waiting for you" when the viewer holds the next step, otherwise who the expense is waiting for. */
export function ExpensePill({ expense }: { expense: Pick<Expense, "status" | "actions"> }) {
  const t = useTranslations("finance.expenseStatus");
  if (expense.actions.includes("review") || expense.actions.includes("approve")) return <Pill tone="wait">{t("yours")}</Pill>;
  if (expense.status === "approved") return <Pill tone="on">{t("approved")}</Pill>;
  if (expense.status === "rejected") return <Pill tone="stop">{t("rejected")}</Pill>;
  return <Pill tone="wait">{t(expense.status)}</Pill>;
}

export function Bar({ value, className, tone = "brand" }: { value: number; className?: string; tone?: "brand" | "light" }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-2 overflow-hidden rounded-full", tone === "light" ? "bg-white/15" : "bg-[#eceae3] dark:bg-surface-sunken", className)}
    >
      <motion.span
        className={cn("block h-full rounded-full", tone === "light" ? "bg-white" : "bg-brand-bar")}
        initial={{ width: 0 }}
        whileInView={{ width: `${clamped}%` }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
      />
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("rounded-[18px] border border-hairline bg-canvas p-5 sm:p-7", className)}>{children}</section>;
}

export function CardHead({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2.5 font-display text-[1.25rem] font-semibold leading-snug text-ink">{title}</h2>
      {children}
    </div>
  );
}

/** Dates with Latin digits, in the reader's language. */
export function useDates() {
  const locale = useLocale();
  const make = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(latn(locale), { timeZone: "UTC", ...options });
  const dayMonth = make({ day: "numeric", month: "long" });
  const full = make({ day: "numeric", month: "long", year: "numeric" });
  const monthYear = make({ month: "long", year: "numeric" });
  const month = make({ month: "long" });
  const day = make({ day: "numeric" });
  const parse = (value: string) => new Date(value.length === 7 ? `${value}-01` : value);

  return {
    dayMonth: (value: string) => dayMonth.format(parse(value)),
    full: (value: string) => full.format(parse(value)),
    monthYear: (value: string) => monthYear.format(parse(value)),
    month: (value: string) => month.format(parse(value)),
    day: (value: string) => day.format(parse(value)),
  };
}
