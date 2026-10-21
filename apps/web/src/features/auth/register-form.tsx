"use client";

import { useLocale, useTranslations } from "next-intl";
import type { SubmitEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Input } from "@/components/ui/input";
import { Link, useRouter } from "@/i18n/navigation";
import { ApiError } from "@/lib/api";
import type { Locale } from "@/lib/types";
import { useRegister } from "./queries";
import { useApiErrorMessage } from "./use-api-error-message";

export function RegisterForm() {
  const t = useTranslations("auth");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const register = useRegister();
  const formError = useApiErrorMessage()(register.error);
  const fieldError = (field: string) =>
    register.error instanceof ApiError ? register.error.firstFieldError(field) : undefined;

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    register.mutate(
      {
        name: String(form.get("name")),
        email: String(form.get("email")),
        password: String(form.get("password")),
        password_confirmation: String(form.get("password_confirmation")),
        locale,
      },
      { onSuccess: () => router.replace("/onboarding") },
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <FormAlert message={formError} />

      <Field label={t("name")} error={fieldError("name")}>
        <Input name="name" autoComplete="name" required autoFocus />
      </Field>

      <Field label={t("email")} error={fieldError("email")}>
        <Input name="email" type="email" autoComplete="email" required dir="ltr" />
      </Field>

      <Field label={t("password")} hint={t("passwordHint")} error={fieldError("password")}>
        <Input name="password" type="password" autoComplete="new-password" required minLength={10} dir="ltr" />
      </Field>

      <Field label={t("passwordConfirmation")}>
        <Input name="password_confirmation" type="password" autoComplete="new-password" required dir="ltr" />
      </Field>

      <Button type="submit" size="lg" disabled={register.isPending} className="mt-2">
        {register.isPending ? t("creatingAccount") : t("createAccount")}
      </Button>

      <p className="text-center text-label text-slate">
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t("loginLink")}
        </Link>
      </p>
    </form>
  );
}
