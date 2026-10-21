import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ar", "fr", "en"],
  defaultLocale: "ar",
});

export type Locale = (typeof routing.locales)[number];

export function directionOf(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}
