"use client";

import { useLocale } from "next-intl";
import { useOrganization } from "@/features/organization/organization-context";

// The API stores amounts in minor units (1 MRU = 100). Screens show whole units:
// Mauritanian NGOs budget in ouguiyas, never in khoums.
const MINOR = 100;

export const toMinor = (units: number) => Math.round(units * MINOR);
export const toUnits = (minor: number) => minor / MINOR;

/** Currency word next to a figure, as people say it: "أوقية", not "MRU". */
const UNIT_NAMES: Record<string, Partial<Record<string, string>>> = {
  MRU: { ar: "أوقية", fr: "MRU", en: "MRU" },
};

/** Latin digits in every language, as in the design and on Mauritanian invoices. */
export const latn = (locale: string) => `${locale}-u-nu-latn`;

export function useMoney() {
  const locale = useLocale();
  const { currency } = useOrganization().organization;
  const whole = new Intl.NumberFormat(latn(locale), { maximumFractionDigits: 0 });
  const short = new Intl.NumberFormat(latn(locale), { notation: "compact", maximumFractionDigits: 2 });

  return {
    unit: UNIT_NAMES[currency]?.[locale] ?? currency,
    /** 1300000000 → "13,000,000" */
    amount: (minor: number) => whole.format(Math.round(toUnits(minor))),
    /** 1300000000 → "13 مليون", for chart axes. */
    compact: (minor: number) => short.format(toUnits(minor)),
  };
}

export const percentOf = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
