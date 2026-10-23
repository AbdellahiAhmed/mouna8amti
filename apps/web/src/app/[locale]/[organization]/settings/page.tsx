"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, type ReactNode, type SubmitEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Input, Select } from "@/components/ui/input";
import { currentUserKey, useLogout } from "@/features/auth/queries";
import { useApiErrorMessage } from "@/features/auth/use-api-error-message";
import { Card, CardHead } from "@/features/finance/ui";
import { currencyName, monthName, regionName } from "@/features/onboarding/options";
import { useOrganization } from "@/features/organization/organization-context";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { ApiError, api } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { Organization, Resource, User } from "@/lib/types";

const LANGUAGES: Record<Locale, string> = { ar: "العربية", fr: "Français", en: "English" };

export default function SettingsPage() {
  const t = useTranslations("finance.settings");

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="font-display text-[2rem] font-semibold leading-tight text-night dark:text-ink">{t("title")}</h1>
        <p className="mt-1 text-body-lg text-slate">{t("subtitle")}</p>
      </header>
      <OrganizationSection />
      <LanguageSection />
      <OrganizationsSection />
      <AccountSection />
    </div>
  );
}

function Row({ label, value, action }: { label: string; value: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center gap-4 border-t border-hairline-soft py-4 first-of-type:border-t-0">
      <div className="flex min-w-0 flex-1 flex-col leading-normal">
        <span className="text-caption text-slate">{label}</span>
        <span className="font-medium text-ink">{value}</span>
      </div>
      {action}
    </div>
  );
}

function OrganizationSection() {
  const t = useTranslations("finance.settings");
  const locale = useLocale();
  const { organization, can } = useOrganization();
  const [editing, setEditing] = useState(false);
  const start = organization.fiscal_year_start_month;
  const end = ((start + 10) % 12) + 1;

  return (
    <Card>
      <CardHead title={t("organization")}>
        {can("organization.manage") && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            {t("edit")}
          </Button>
        )}
      </CardHead>
      <div>
        <Row label={t("name")} value={organization.name} />
        <Row label={t("legalName")} value={organization.legal_name ?? "—"} />
        <Row label={t("country")} value={regionName(locale, organization.country)} />
        <Row label={t("fiscalYear")} value={t("fiscalRange", { from: monthName(locale, start), to: monthName(locale, end) })} />
        <Row label={t("currency")} value={`${currencyName(locale, organization.currency)} (${organization.currency})`} />
      </div>
      <p className="mt-2 text-caption text-steel">{t("currencyFixed")}</p>
      {can("organization.manage") && (
        <Dialog open={editing} onOpenChange={setEditing} title={t("editOrganization")}>
          <OrganizationForm organization={organization} onDone={() => setEditing(false)} />
        </Dialog>
      )}
    </Card>
  );
}

function OrganizationForm({ organization, onDone }: { organization: Organization; onDone: () => void }) {
  const t = useTranslations("finance.settings");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: (input: Pick<Organization, "name" | "legal_name" | "locale" | "fiscal_year_start_month">) =>
      api<Resource<Organization>>(`/orgs/${organization.slug}`, { method: "PUT", json: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: currentUserKey }),
  });
  const formError = useApiErrorMessage()(save.error);
  const fieldError = (field: string) => (save.error instanceof ApiError ? save.error.firstFieldError(field) : undefined);

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    save.mutate(
      {
        name: String(form.get("name")).trim(),
        legal_name: String(form.get("legal_name") ?? "").trim() || null,
        locale: String(form.get("locale")) as Locale,
        fiscal_year_start_month: Number(form.get("fiscal_year_start_month")),
      },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <FormAlert message={formError} />
      <Field label={t("name")} error={fieldError("name")}>
        <Input name="name" defaultValue={organization.name} required maxLength={200} />
      </Field>
      <Field label={t("legalName")} error={fieldError("legal_name")}>
        <Input name="legal_name" defaultValue={organization.legal_name ?? ""} maxLength={200} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("defaultLanguage")} error={fieldError("locale")}>
          <Select name="locale" defaultValue={organization.locale}>
            {routing.locales.map((l) => <option key={l} value={l}>{LANGUAGES[l]}</option>)}
          </Select>
        </Field>
        <Field label={t("fiscalStart")} error={fieldError("fiscal_year_start_month")}>
          <Select name="fiscal_year_start_month" defaultValue={organization.fiscal_year_start_month}>
            {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{monthName(locale, i + 1)}</option>)}
          </Select>
        </Field>
      </div>
      <div className="mt-2 flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onDone}>{t("cancel")}</Button>
        <Button type="submit" disabled={save.isPending}>{save.isPending ? t("saving") : t("save")}</Button>
      </div>
    </form>
  );
}

function LanguageSection() {
  const t = useTranslations("finance.settings");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useOrganization();
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: (next: Locale) => api<Resource<User>>("/auth/profile", { method: "PUT", json: { name: user.name, locale: next } }),
    onSuccess: (_, next) => {
      queryClient.invalidateQueries({ queryKey: currentUserKey });
      router.replace(pathname, { locale: next });
    },
  });

  return (
    <Card>
      <CardHead title={t("language")} />
      <p className="text-body text-slate">{t("languageHint")}</p>
      <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label={t("language")}>
        {routing.locales.map((l) => (
          <button
            key={l}
            type="button"
            role="radio"
            lang={l}
            aria-checked={l === locale}
            disabled={save.isPending}
            onClick={() => l !== locale && save.mutate(l)}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-full border px-5 font-medium transition-colors duration-150",
              l === locale ? "border-primary bg-primary text-on-primary" : "border-hairline-strong bg-canvas text-charcoal hover:border-[#9cc9b6]",
            )}
          >
            {l === locale && <Check aria-hidden className="size-4" />}
            {LANGUAGES[l]}
          </button>
        ))}
      </div>
    </Card>
  );
}

function OrganizationsSection() {
  const t = useTranslations("finance.settings");
  const { user, organization } = useOrganization();

  return (
    <Card>
      <CardHead title={t("myOrganizations")} />
      <div>
        {(user.memberships ?? []).map((m) =>
          m.organization ? (
            <Row
              key={m.id}
              label={m.organization.legal_name ?? m.organization.currency}
              value={m.organization.name}
              action={
                m.organization.id === organization.id ? (
                  <span className="rounded-full bg-primary-soft px-3 py-1 text-caption font-medium text-primary">{t("current")}</span>
                ) : (
                  <Button asChild variant="ghost" size="sm"><Link href={`/${m.organization.slug}`}>{t("open")}</Link></Button>
                )
              }
            />
          ) : null,
        )}
      </div>
      <Button asChild variant="secondary" className="mt-4">
        <Link href="/onboarding"><Plus aria-hidden />{t("addOrganization")}</Link>
      </Button>
    </Card>
  );
}

function AccountSection() {
  const t = useTranslations("finance.settings");
  const { user, membership } = useOrganization();
  const logout = useLogout();
  const router = useRouter();
  const [changing, setChanging] = useState(false);

  return (
    <Card>
      <CardHead title={t("account")} />
      <div>
        <Row label={t("name")} value={[user.name, membership.title].filter(Boolean).join(" — ")} />
        <Row label={t("email")} value={<span dir="ltr">{user.email}</span>} />
        <Row label={t("password")} value="••••••••••" action={<Button variant="ghost" size="sm" onClick={() => setChanging(true)}>{t("change")}</Button>} />
        <Row
          label={t("thisDevice")}
          value={t("signOut")}
          action={<Button variant="ghost" size="sm" onClick={() => logout.mutate(undefined, { onSettled: () => router.replace("/login") })}>{t("signOutAction")}</Button>}
        />
      </div>
      <Dialog open={changing} onOpenChange={setChanging} title={t("changePassword")} description={t("changePasswordHint")}>
        <PasswordForm onDone={() => setChanging(false)} />
      </Dialog>
    </Card>
  );
}

function PasswordForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations("finance.settings");
  const ta = useTranslations("auth");
  const save = useMutation({
    mutationFn: (input: Record<string, string>) => api<void>("/auth/password", { method: "PUT", json: input }),
  });
  const formError = useApiErrorMessage()(save.error);
  const fieldError = (field: string) => (save.error instanceof ApiError ? save.error.firstFieldError(field) : undefined);

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    save.mutate(Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>, { onSuccess: onDone });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <FormAlert message={formError} />
      <Field label={t("currentPassword")} error={fieldError("current_password")}>
        <Input name="current_password" type="password" autoComplete="current-password" required autoFocus />
      </Field>
      <Field label={t("newPassword")} hint={ta("passwordHint")} error={fieldError("password")}>
        <Input name="password" type="password" autoComplete="new-password" required />
      </Field>
      <Field label={ta("passwordConfirmation")}>
        <Input name="password_confirmation" type="password" autoComplete="new-password" required />
      </Field>
      <div className="mt-2 flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onDone}>{t("cancel")}</Button>
        <Button type="submit" disabled={save.isPending}>{save.isPending ? t("saving") : t("save")}</Button>
      </div>
    </form>
  );
}
