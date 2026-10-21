"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useState, type SubmitEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Input, Select } from "@/components/ui/input";
import { currentUserKey } from "@/features/auth/queries";
import { useApiErrorMessage } from "@/features/auth/use-api-error-message";
import { useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { Locale, Organization, Resource } from "@/lib/types";
import { COUNTRIES, CURRENCIES, currencyName, DEFAULT_CURRENCY, monthName, regionName } from "./options";

type Draft = {
  name: string;
  legal_name: string;
  country: string;
  currency: string;
  locale: Locale;
  fiscal_year_start_month: number;
};

const STEPS = ["stepIdentity", "stepSettings", "stepReview"] as const;
const FIELDS_BY_STEP: (keyof Draft)[][] = [["name", "legal_name", "country"], ["currency", "locale", "fiscal_year_start_month"], []];

export function OnboardingWizard() {
  const t = useTranslations("onboarding");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;
  const isRtl = locale === "ar";
  const router = useRouter();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [draft, setDraft] = useState<Draft>({
    name: "",
    legal_name: "",
    country: "MR",
    currency: "MRU",
    locale,
    fiscal_year_start_month: 1,
  });

  const create = useMutation({
    mutationFn: (payload: Draft) =>
      api<Resource<Organization>>("/organizations", {
        method: "POST",
        json: { ...payload, legal_name: payload.legal_name || null },
      }),
    onSuccess: async ({ data }) => {
      await queryClient.invalidateQueries({ queryKey: currentUserKey });
      router.replace(`/${data.slug}`);
    },
    // A server-side validation error sends the user back to the step that owns the field.
    onError: (error) => {
      if (!(error instanceof ApiError)) return;
      const firstInvalid = FIELDS_BY_STEP.findIndex((fields) => fields.some((f) => error.firstFieldError(f)));
      if (firstInvalid >= 0) go(firstInvalid);
    },
  });

  const formError = useApiErrorMessage()(create.error);
  const fieldError = (field: keyof Draft) =>
    create.error instanceof ApiError ? create.error.firstFieldError(field) : undefined;
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  function go(next: number) {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  }

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < STEPS.length - 1) go(step + 1);
    else create.mutate(draft);
  }

  const offset = 24 * (isRtl ? -1 : 1) * direction;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-8" noValidate>
      <ol className="grid grid-cols-3 gap-3" aria-label={t("title")}>
        {STEPS.map((key, index) => (
          <li key={key} className="flex flex-col gap-2" aria-current={index === step ? "step" : undefined}>
            <span className="relative h-1 overflow-hidden rounded-full bg-surface-sunken">
              <motion.span
                className="absolute inset-y-0 start-0 rounded-full bg-primary"
                initial={false}
                animate={{ width: index <= step ? "100%" : "0%" }}
                transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
              />
            </span>
            <span className={cn("text-caption", index === step ? "font-medium text-ink" : "text-steel")}>{t(key)}</span>
          </li>
        ))}
      </ol>

      <FormAlert message={formError} />

      <div className="relative min-h-[17rem]">
        <AnimatePresence mode="wait" initial={false} custom={offset}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: offset }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -offset }}
            transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
            className="flex flex-col gap-5"
          >
            {step === 0 && (
              <>
                <Field label={t("name")} error={fieldError("name")}>
                  <Input
                    value={draft.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder={t("namePlaceholder")}
                    required
                    autoFocus
                  />
                </Field>
                <Field label={t("legalName")} error={fieldError("legal_name")}>
                  <Input value={draft.legal_name} onChange={(e) => update("legal_name", e.target.value)} />
                </Field>
                <Field label={t("country")} error={fieldError("country")}>
                  <Select
                    value={draft.country}
                    onChange={(e) => {
                      update("country", e.target.value);
                      update("currency", DEFAULT_CURRENCY[e.target.value] ?? draft.currency);
                    }}
                  >
                    {COUNTRIES.map((code) => (
                      <option key={code} value={code}>
                        {regionName(locale, code)}
                      </option>
                    ))}
                  </Select>
                </Field>
              </>
            )}

            {step === 1 && (
              <>
                <Field label={t("currency")} hint={t("currencyHint")} error={fieldError("currency")}>
                  <Select value={draft.currency} onChange={(e) => update("currency", e.target.value)}>
                    {[...new Set([draft.currency, ...CURRENCIES])].map((code) => (
                      <option key={code} value={code}>
                        {currencyName(locale, code)} ({code})
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={t("locale")} error={fieldError("locale")}>
                  <Select value={draft.locale} onChange={(e) => update("locale", e.target.value as Locale)}>
                    <option value="ar">العربية</option>
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                  </Select>
                </Field>
                <Field label={t("fiscalStart")} error={fieldError("fiscal_year_start_month")}>
                  <Select
                    value={draft.fiscal_year_start_month}
                    onChange={(e) => update("fiscal_year_start_month", Number(e.target.value))}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <option key={month} value={month}>
                        {monthName(locale, month)}
                      </option>
                    ))}
                  </Select>
                </Field>
              </>
            )}

            {step === 2 && (
              <div className="rounded-md border border-hairline bg-canvas p-6">
                <p className="font-display text-h3 text-ink">{draft.name}</p>
                {draft.legal_name && <p className="mt-1 text-label text-slate">{draft.legal_name}</p>}
                <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 text-label">
                  <ReviewItem label={t("country")} value={regionName(locale, draft.country)} />
                  <ReviewItem label={t("currency")} value={`${currencyName(locale, draft.currency)} (${draft.currency})`} />
                  <ReviewItem label={t("locale")} value={{ ar: "العربية", fr: "Français", en: "English" }[draft.locale]} />
                  <ReviewItem label={t("fiscalStart")} value={monthName(locale, draft.fiscal_year_start_month)} />
                </dl>
                <p className="mt-6 flex gap-2 rounded-sm bg-primary-soft px-4 py-3 text-label text-primary">
                  <Check aria-hidden className="mt-0.5 size-4 shrink-0" />
                  {t("reviewHint")}
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => go(step - 1)}
          className={cn(step === 0 && "invisible")}
        >
          <ArrowLeft className="rtl:rotate-180" aria-hidden />
          {tc("back")}
        </Button>
        <Button
          type="submit"
          size="lg"
          disabled={(step === 0 && draft.name.trim() === "") || create.isPending}
        >
          {step < STEPS.length - 1 ? tc("continue") : create.isPending ? t("creating") : t("create")}
          {step < STEPS.length - 1 && <ArrowRight className="rtl:rotate-180" aria-hidden />}
        </Button>
      </div>
    </form>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-caption text-steel">{label}</dt>
      <dd className="mt-0.5 font-medium text-ink">{value}</dd>
    </div>
  );
}
