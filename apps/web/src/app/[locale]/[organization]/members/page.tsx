"use client";

import { ArrowLeft, UserPlus } from "lucide-react";
import { motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useState, type SubmitEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Input, Select } from "@/components/ui/input";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { useApiErrorMessage } from "@/features/auth/use-api-error-message";
import { Card, Pill } from "@/features/finance/ui";
import { useOrganization } from "@/features/organization/organization-context";
import { useInviteMember, useMembers, useRoles } from "@/features/organization/queries";
import { ApiError } from "@/lib/api";
import type { Locale, Membership } from "@/lib/types";

// Most telling abilities first: a card shows the top three in plain words.
const ABILITIES = [
  "expenses.approve",
  "expenses.review",
  "expenses.create",
  "projects.manage",
  "budgets.manage",
  "grants.manage",
  "members.manage",
  "audit.view",
  "projects.view",
] as const;

const roleKeys = (m: Membership) => (m.roles ?? []).map((r) => r.key);
const holds = (m: Membership, permission: string) => (m.permissions ?? []).includes(permission);

/** People who do a step, preferring dedicated roles over the all-powerful administrator. */
function peopleFor(members: Membership[], permission: string) {
  const able = members.filter((m) => m.status === "active" && holds(m, permission));
  const dedicated = able.filter((m) => !roleKeys(m).includes("admin"));
  return (dedicated.length ? dedicated : able).map((m) => m.user?.name).filter(Boolean) as string[];
}

export default function TeamPage() {
  const t = useTranslations("finance.team");
  const { can } = useOrganization();
  const { data, error, isPending, refetch } = useMembers();
  const [inviting, setInviting] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[2rem] font-semibold leading-tight text-night dark:text-ink">{t("title")}</h1>
          <p className="mt-1 text-body-lg text-slate">
            {data ? t("subtitle", { count: data.data.filter((m) => m.status === "active").length }) : t("subtitleLoading")}
          </p>
        </div>
        {can("members.manage") && (
          <Button size="lg" variant="secondary" onClick={() => setInviting(true)}>
            <UserPlus aria-hidden />
            {t("invite")}
          </Button>
        )}
      </header>

      {isPending ? (
        <div className="flex flex-col gap-6" role="status">
          <Skeleton className="h-44 rounded-[18px]" />
          <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-56 rounded-[18px]" />)}</div>
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : data.data.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <>
          <ApprovalChain members={data.data} />
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(22rem,100%),1fr))] gap-4">
            {data.data.map((member, index) => <MemberCard key={member.id} member={member} index={index} />)}
          </div>
        </>
      )}

      {can("members.manage") && <InviteDialog open={inviting} onOpenChange={setInviting} />}
    </div>
  );
}

function ApprovalChain({ members }: { members: Membership[] }) {
  const t = useTranslations("finance.team");
  const list = new Intl.ListFormat(useLocale(), { type: "conjunction" });
  const steps = [
    { role: t("stepSubmit"), people: peopleFor(members, "expenses.create").filter((n) => !peopleFor(members, "expenses.review").includes(n) && !peopleFor(members, "expenses.approve").includes(n)) },
    { role: t("stepReview"), people: peopleFor(members, "expenses.review") },
    { role: t("stepApprove"), people: peopleFor(members, "expenses.approve") },
  ];

  return (
    <Card className="border-night bg-night text-white sm:p-8">
      <span className="text-caption font-medium text-white/70">{t("chainEyebrow")}</span>
      <p className="mt-2 max-w-3xl text-[1.125rem] leading-[1.9] text-white/95">{t("chainBody")}</p>
      <ol className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-stretch">
        {steps.map((step, i) => (
          <li key={step.role} className="flex flex-1 items-center gap-3">
            <div className="flex flex-1 items-center gap-3 rounded-[14px] bg-white/10 px-4 py-3.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white font-display font-semibold text-night">{i + 1}</span>
              <span className="flex min-w-0 flex-col leading-snug">
                <span className="text-caption text-white/70">{step.role}</span>
                <span className="truncate font-semibold">{step.people.length ? list.format(step.people) : t("nobody")}</span>
              </span>
            </div>
            {i < steps.length - 1 && <ArrowLeft aria-hidden className="hidden size-5 shrink-0 text-white/60 sm:block ltr:rotate-180" />}
          </li>
        ))}
      </ol>
    </Card>
  );
}

function MemberCard({ member, index }: { member: Membership; index: number }) {
  const t = useTranslations("finance.team");
  const ts = useTranslations("app.status");
  const locale = useLocale() as Locale;
  const { membership: me } = useOrganization();
  const role = member.roles?.[0];
  const abilities = ABILITIES.filter((p) => holds(member, p)).slice(0, 3);
  const knownRole = role?.is_system ? (role.key as "admin" | "director" | "accountant" | "project_coordinator" | "hr_officer" | "logistician" | "donor_viewer") : null;
  const name = member.user?.name ?? "";

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index, 8) * 0.05, ease: [0.2, 0, 0, 1] }}
      className="flex flex-col gap-4 rounded-[18px] border border-hairline bg-canvas p-5 sm:p-6"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary font-display font-semibold text-on-primary">
          {name.split(/\s+/).slice(0, 2).map((p) => p[0]).join("")}
        </span>
        <div className="min-w-0 flex-1 leading-snug">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-[1.0625rem] font-semibold text-ink">{name}</h2>
            {member.id === me.id && <Pill tone="done">{t("you")}</Pill>}
            {member.status !== "active" && <Pill tone="wait">{ts(member.status)}</Pill>}
          </div>
          <span className="text-caption text-slate">{member.title ?? role?.name[locale]}</span>
        </div>
      </div>
      {knownRole && <p className="text-body text-charcoal">{t(`about.${knownRole}`)}</p>}
      {abilities.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-caption text-slate">{t("canDo")}</span>
          <div className="flex flex-wrap gap-2">
            {abilities.map((p) => (
              <span key={p} className="rounded-full bg-mist px-3 py-1 text-caption font-medium text-primary dark:bg-surface">
                {t(`abilities.${p.replace(".", "_") as "expenses_approve"}`)}
              </span>
            ))}
          </div>
        </div>
      )}
      <span className="mt-auto truncate border-t border-hairline-soft pt-3 text-caption text-steel" dir="ltr">
        {member.user?.email}
      </span>
    </motion.section>
  );
}

function InviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations("finance.team");
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t("inviteTitle")} description={t("inviteHint")}>
      <InviteForm key={String(open)} onDone={() => onOpenChange(false)} />
    </Dialog>
  );
}

function InviteForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations("finance.team");
  const locale = useLocale() as Locale;
  const roles = useRoles();
  const invite = useInviteMember();
  const formError = useApiErrorMessage()(invite.error);
  const fieldError = (field: string) => (invite.error instanceof ApiError ? invite.error.firstFieldError(field) : undefined);

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    invite.mutate(
      {
        name: String(form.get("name")).trim(),
        email: String(form.get("email")).trim(),
        title: String(form.get("title") ?? "").trim() || null,
        role_id: Number(form.get("role_id")),
      },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <FormAlert message={formError} />
      <Field label={t("name")} error={fieldError("name")}>
        <Input name="name" required maxLength={120} autoFocus />
      </Field>
      <Field label={t("email")} error={fieldError("email")}>
        <Input name="email" type="email" required dir="ltr" />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("role")} error={fieldError("role_id")}>
          <Select key={roles.data ? "ready" : "loading"} name="role_id" defaultValue="" required>
            <option value="" disabled />
            {roles.data?.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name[locale]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("jobTitle")} error={fieldError("title")}>
          <Input name="title" maxLength={120} />
        </Field>
      </div>
      <div className="mt-2 flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onDone}>
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={invite.isPending}>
          {invite.isPending ? t("sending") : t("send")}
        </Button>
      </div>
    </form>
  );
}
