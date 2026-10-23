"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { SubmitEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Input } from "@/components/ui/input";
import { useRouter } from "@/i18n/navigation";
import { ApiError, api } from "@/lib/api";
import type { Resource, User } from "@/lib/types";
import { currentUserKey } from "./queries";
import { useApiErrorMessage } from "./use-api-error-message";

/** Opened from the invitation e-mail: the link carries the token and the address. */
export function InvitationForm() {
  const t = useTranslations("auth");
  const params = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const email = params.get("email") ?? "";
  const accept = useMutation({
    mutationFn: (input: { password: string; password_confirmation: string }) =>
      api<Resource<User>>("/auth/invitations/password", { method: "POST", json: { ...input, email, token: params.get("token") ?? "" } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: currentUserKey }),
  });
  const formError = useApiErrorMessage()(accept.error);
  const fieldError = (field: string) => (accept.error instanceof ApiError ? accept.error.firstFieldError(field) : undefined);

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    accept.mutate(
      { password: String(form.get("password")), password_confirmation: String(form.get("password_confirmation")) },
      { onSuccess: () => router.replace("/") },
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <FormAlert message={fieldError("token") ?? formError} />
      <Field label={t("email")}>
        <Input value={email} readOnly dir="ltr" className="bg-surface-sunken" />
      </Field>
      <Field label={t("password")} hint={t("passwordHint")} error={fieldError("password")}>
        <Input name="password" type="password" autoComplete="new-password" required autoFocus />
      </Field>
      <Field label={t("passwordConfirmation")}>
        <Input name="password_confirmation" type="password" autoComplete="new-password" required />
      </Field>
      <Button type="submit" size="lg" disabled={accept.isPending || !email}>
        {accept.isPending ? t("invitation.joining") : t("invitation.join")}
      </Button>
    </form>
  );
}
