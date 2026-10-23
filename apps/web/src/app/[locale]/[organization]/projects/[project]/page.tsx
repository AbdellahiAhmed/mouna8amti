"use client";

import { ChevronLeft, MapPin, Pencil, Plus, User } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { use, useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { BudgetLinesDialog } from "@/features/finance/budget-lines-dialog";
import { GrantFormDialog } from "@/features/finance/grant-form-dialog";
import { useBudgetLines, useExpenses, useGrants } from "@/features/finance/queries";
import { Bar, Card, CardHead, ExpensePill, ProjectPill, useDates } from "@/features/finance/ui";
import { useOrganization } from "@/features/organization/organization-context";
import { ProjectFormDialog } from "@/features/projects/project-form-dialog";
import { useProject } from "@/features/projects/queries";
import { Link } from "@/i18n/navigation";
import { percentOf, useMoney } from "@/lib/money";
import type { Grant, Project } from "@/lib/types";

export default function ProjectPage({ params }: { params: Promise<{ project: string }> }) {
  const id = Number(use(params).project);
  const project = useProject(id);

  if (project.isPending) {
    return (
      <div className="flex flex-col gap-6" role="status">
        <Skeleton className="h-24 w-2/3" />
        <Skeleton className="h-56 rounded-[18px]" />
        <Skeleton className="h-72 rounded-[18px]" />
      </div>
    );
  }
  if (project.error) return <ErrorState error={project.error} onRetry={() => project.refetch()} />;

  return <ProjectStory project={project.data.data} />;
}

function ProjectStory({ project }: { project: Project }) {
  const t = useTranslations("finance.project");
  const tn = useTranslations("app.nav");
  const money = useMoney();
  const { organization, can } = useOrganization();
  const [editing, setEditing] = useState(false);
  const budget = project.budget ?? 0;
  const spent = project.spent ?? 0;
  const left = Math.max(0, budget - spent);
  const donors = (project.grants ?? []).map((g) => g.donor?.name).filter(Boolean).join("، ");

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-[0.9375rem] text-slate">
        <Link href={`/${organization.slug}/projects`} className="hover:text-primary">
          {tn("projects")}
        </Link>
        <ChevronLeft aria-hidden className="size-4 ltr:rotate-180" />
        <span className="text-ink">{project.name}</span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-[1.75rem] font-semibold leading-tight text-night dark:text-ink sm:text-[2rem]">{project.name}</h1>
            <ProjectPill status={project.status} />
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[0.9375rem] text-slate">
            {project.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin aria-hidden className="size-4" />
                {project.location}
              </span>
            )}
            {donors && <span>{donors}</span>}
            {project.manager && (
              <span className="inline-flex items-center gap-1.5">
                <User aria-hidden className="size-4" />
                {t("manager", { name: project.manager.name })}
              </span>
            )}
          </div>
        </div>
        {can("projects.manage") && (
          <Button variant="secondary" onClick={() => setEditing(true)}>
            <Pencil aria-hidden />
            {t("edit")}
          </Button>
        )}
      </header>

      <Card className="flex flex-wrap items-center gap-8">
        <ProgressRing value={project.progress} label={t("progressLabel")} />
        <div className="flex min-w-0 flex-[1_1_22rem] flex-col gap-5">
          <p className="font-display text-[1.25rem] leading-[1.8] text-ink sm:text-[1.4rem]">
            {t.rich(project.status === "closed" ? "storyClosed" : "story", {
              progress: project.progress,
              budget: money.amount(budget),
              spent: money.amount(spent),
              left: money.amount(left),
              unit: money.unit,
              b: (chunk) => <b className="font-semibold text-primary">{chunk}</b>,
            })}
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              [t("budget"), budget],
              [t("spent"), spent],
              [t("left"), left],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-[14px] bg-mist px-4 py-3 dark:bg-surface">
                <span className="text-caption text-slate">{label}</span>
                <span className="block font-display text-[1.125rem] font-semibold tabular-nums text-ink sm:text-[1.375rem]">
                  {money.amount(value as number)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(27rem,100%),1fr))] gap-6">
        <Funding project={project} />
        <WhereMoneyWent project={project} />
      </div>

      <ProjectExpenses project={project} />

      {can("projects.manage") && <ProjectFormDialog project={project} open={editing} onOpenChange={setEditing} />}
    </div>
  );
}

function ProgressRing({ value, label }: { value: number; label: string }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid size-36 shrink-0 place-items-center">
      <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90 rtl:scale-y-[-1]" aria-hidden>
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="9" className="stroke-primary-soft" />
        <motion.circle
          cx="60" cy="60" r={r} fill="none" strokeWidth="9" strokeLinecap="round" className="stroke-primary"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - Math.min(100, value) / 100) }}
          transition={{ duration: 0.9, ease: [0.2, 0, 0, 1] }}
        />
      </svg>
      <div className="relative flex flex-col items-center leading-tight">
        <span className="font-display text-[2rem] font-semibold text-night dark:text-ink">{value}%</span>
        <span className="text-caption text-slate">{label}</span>
      </div>
    </div>
  );
}

function Funding({ project }: { project: Project }) {
  const t = useTranslations("finance.project");
  const money = useMoney();
  const dates = useDates();
  const { can } = useOrganization();
  const grants = useGrants({ project_id: project.id });
  const [editing, setEditing] = useState<Grant | "new" | null>(null);
  const canManage = can("grants.manage");

  return (
    <Card>
      <CardHead title={t("fundingTitle")}>
        {canManage && (
          <Button variant="ghost" size="sm" onClick={() => setEditing("new")}>
            <Plus aria-hidden />
            {t("addGrant")}
          </Button>
        )}
      </CardHead>
      {grants.isPending && <Skeleton className="mt-4 h-40" />}
      {grants.data?.data.length === 0 && <p className="py-6 text-body text-slate">{t("noGrants")}</p>}
      {grants.data?.data.map((grant) => {
        const tranches = grant.tranches ?? [];
        const receivedCount = tranches.filter((tr) => tr.received_on).length;
        return (
          <div key={grant.id} className="mt-4 flex flex-col gap-3 border-t border-hairline-soft pt-4 first-of-type:border-t-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[1.0625rem] font-semibold text-ink">{grant.donor?.name}</p>
                <p className="text-caption text-slate">{t("promised", { amount: money.amount(grant.amount), unit: money.unit })}</p>
              </div>
              {canManage && (
                <Button variant="ghost" size="icon" aria-label={t("editGrant")} onClick={() => setEditing(grant)}>
                  <Pencil aria-hidden />
                </Button>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 text-[0.9375rem] text-charcoal">
              <span>
                {t.rich("received", {
                  amount: money.amount(grant.received),
                  count: receivedCount,
                  b: (chunk) => <b className="font-display font-semibold text-ink">{chunk}</b>,
                })}
              </span>
              <span className="font-display font-semibold text-primary">{percentOf(grant.received, grant.amount)}%</span>
            </div>
            <Bar value={percentOf(grant.received, grant.amount)} />
            <ol className="flex flex-col">
              {tranches.map((tr, i) => (
                <li key={tr.id} className="flex items-center justify-between gap-3 border-t border-hairline-soft py-2.5 first:border-t-0">
                  <span className="flex flex-col leading-snug">
                    <span className={tr.received_on ? "text-ink" : "text-slate"}>
                      {tr.received_on ? t("trancheN", { n: i + 1 }) : t("trancheAwaited", { n: i + 1 })}
                    </span>
                    <span className="text-caption text-slate">
                      {tr.received_on ? dates.full(tr.received_on) : t("expected", { date: dates.full(tr.expected_on) })}
                    </span>
                  </span>
                  <span className={`font-display font-semibold tabular-nums ${tr.received_on ? "text-ink" : "text-steel"}`}>
                    {money.amount(tr.amount)}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        );
      })}
      {canManage && (
        <GrantFormDialog
          grant={editing === "new" || editing === null ? undefined : editing}
          defaults={{ project_id: project.id }}
          open={editing !== null}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
    </Card>
  );
}

function WhereMoneyWent({ project }: { project: Project }) {
  const t = useTranslations("finance.project");
  const money = useMoney();
  const { can } = useOrganization();
  const lines = useBudgetLines(project.id);
  const [editing, setEditing] = useState(false);
  const spent = project.spent ?? 0;

  return (
    <Card>
      <CardHead title={t("spendingTitle")}>
        {can("budgets.manage") && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil aria-hidden />
            {t("editBudget")}
          </Button>
        )}
      </CardHead>
      <p className="text-caption text-slate">{t("spendingOf", { amount: money.amount(spent) })}</p>
      {lines.isPending && <Skeleton className="mt-4 h-40" />}
      {lines.data?.data.length === 0 && <p className="py-6 text-body text-slate">{t("noLines")}</p>}
      <div className="mt-2">
        {lines.data?.data.map((line) => (
          <div key={line.id} className="flex flex-col gap-2 border-t border-hairline-soft py-3.5 first:border-t-0">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-medium text-ink">{line.name}</span>
              <span className="font-display font-semibold tabular-nums text-ink">
                {money.amount(line.spent)}
                <span className="ms-2 font-sans text-caption font-normal text-slate">
                  {t("ofLine", { amount: money.amount(line.amount), percent: percentOf(line.spent, line.amount) })}
                </span>
              </span>
            </div>
            <Bar value={percentOf(line.spent, line.amount)} />
          </div>
        ))}
      </div>
      {lines.data && (
        <BudgetLinesDialog projectId={project.id} lines={lines.data.data} open={editing} onOpenChange={setEditing} />
      )}
    </Card>
  );
}

function ProjectExpenses({ project }: { project: Project }) {
  const t = useTranslations("finance.project");
  const money = useMoney();
  const dates = useDates();
  const { organization } = useOrganization();
  const expenses = useExpenses({ project_id: project.id });

  return (
    <Card>
      <CardHead title={t("expensesTitle")}>
        <Link href={`/${organization.slug}/expenses?project=${project.id}`} className="text-[0.9375rem] font-medium text-primary hover:text-night">
          {t("allExpenses")}
        </Link>
      </CardHead>
      {expenses.isPending && <Skeleton className="mt-4 h-40" />}
      {expenses.data?.data.length === 0 && <p className="py-6 text-body text-slate">{t("noExpenses")}</p>}
      <div>
        {expenses.data?.data.slice(0, 6).map((expense) => (
          <Link
            key={expense.id}
            href={`/${organization.slug}/expenses?open=${expense.id}`}
            className="flex items-center gap-4 border-t border-hairline-soft py-3.5 first:border-t-0 hover:bg-surface/60"
          >
            <span className="flex w-12 shrink-0 flex-col items-center rounded-xl bg-mist py-1.5 leading-tight dark:bg-surface">
              <span className="font-display text-[1.125rem] font-semibold text-night dark:text-ink">{dates.day(expense.spent_on)}</span>
              <span className="text-[0.75rem] text-slate">{dates.month(expense.spent_on)}</span>
            </span>
            <span className="flex min-w-0 flex-1 flex-col leading-normal">
              <span className="truncate font-medium text-ink">{expense.description}</span>
              <span className="text-caption text-slate">
                {expense.approved?.name ? t("approvedBy", { name: expense.approved.name }) : expense.payee}
              </span>
            </span>
            <span className="flex flex-col items-end gap-1">
              <span className="font-display font-semibold tabular-nums text-ink">{money.amount(expense.amount)}</span>
              <ExpensePill expense={expense} />
            </span>
          </Link>
        ))}
      </div>
    </Card>
  );
}
