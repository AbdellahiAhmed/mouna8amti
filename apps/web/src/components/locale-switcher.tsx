"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";

const LABELS: Record<Locale, string> = { ar: "العربية", fr: "Français", en: "English" };

export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  return (
    <div
      role="radiogroup"
      aria-label={t("language")}
      className={cn("inline-flex rounded-full bg-surface-sunken p-1", isPending && "opacity-60", className)}
    >
      {routing.locales.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={option === locale}
          lang={option}
          onClick={() => startTransition(() => router.replace(pathname, { locale: option }))}
          className={cn(
            "rounded-full px-3 py-1 text-caption font-medium transition-colors duration-[120ms]",
            option === locale ? "bg-canvas text-ink shadow-[0_0_0_1px_var(--hairline)]" : "text-slate hover:text-ink",
          )}
        >
          {LABELS[option]}
        </button>
      ))}
    </div>
  );
}
