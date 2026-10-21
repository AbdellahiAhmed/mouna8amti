"use client";

import { useTranslations } from "next-intl";
import type { SubmitEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Input } from "@/components/ui/input";
import { Link, useRouter } from "@/i18n/navigation";
import { api, ApiError } from "@/lib/api";
import type { Resource, User } from "@/lib/types";
import { homePathFor, useLogin } from "./queries";
import { useApiErrorMessage } from "./use-api-error-message";

export function LoginForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const login = useLogin();
  const formError = useApiErrorMessage()(login.error);
  const fieldError = (field: string) =>
    login.error instanceof ApiError ? login.error.firstFieldError(field) : undefined;

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    login.mutate(
      {
        email: String(form.get("email")),
        password: String(form.get("password")),
        remember: form.get("remember") === "on",
      },
      {
        onSuccess: async () => {
          const me = await api<Resource<User>>("/auth/me");
          router.replace(homePathFor(me.data));
        },
      },
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <FormAlert message={formError} />

      <Field label={t("email")} error={fieldError("email")}>
        <Input name="email" type="email" autoComplete="email" required autoFocus dir="ltr" />
      </Field>

      <Field label={t("password")} error={fieldError("password")}>
        <Input name="password" type="password" autoComplete="current-password" required dir="ltr" />
      </Field>

      <label className="flex items-center gap-2.5 text-label text-slate">
        <input name="remember" type="checkbox" className="size-4 accent-[var(--primary)]" />
        {t("remember")}
      </label>

      <Button type="submit" size="lg" disabled={login.isPending} className="mt-2">
        {login.isPending ? t("signingIn") : t("signIn")}
      </Button>

      <p className="text-center text-label text-slate">
        {t("noAccount")}{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          {t("registerLink")}
        </Link>
      </p>
    </form>
  );
}
