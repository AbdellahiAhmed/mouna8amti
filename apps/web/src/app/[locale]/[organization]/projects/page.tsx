"use client";

import { Plus } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { Bar, ProjectPill } from "@/features/finance/ui";
import { useOrganization } from "@/features/organization/organization-context";
import { ProjectFormDialog } from "@/features/projects/project-form-dialog";
import { useProjects } from "@/features/projects/queries";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { percentOf, useMoney } from "@/lib/money";
import type { Project, ProjectStatus } from "@/lib/types";

const FILTERS: (ProjectStatus | undefined)[] = [undefined, "active", "closed", "on_hold", "draft"];

export default function ProjectsPage() {
  const t = useTranslations("finance.projects");
  const { can } = useOrganization();
  const [status, setStatus] = useState<ProjectStatus | undefined>();
  const [creating, setCreating] = useState(false);
  // ponytail: one page of 25 covers an NGO's portfolio; filters run client-side so the counts stay global.
  const { data, error, isPending, refetch } = useProjects({});
  const canManage = can("projects.manage");

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[2rem] font-semibold leading-tight text-night dark:text-ink">{t("title")}</h1>
          <p className="mt-1 text-body-lg text-slate">{t("subtitle")}</p>
        </div>
        {canManage && (
          <Button variant="secondary" onClick={() => setCreating(true)}>
            <Plus aria-hidden />
            {t("new")}
          </Button>
        )}
      </header>

      {isPending ? (
        <div className="flex flex-col gap-4" role="status">
          <Skeleton className="h-28 rounded-[18px]" />
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-32 rounded-[18px]" />
          ))}
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : data.data.length === 0 ? (
        <EmptyState title={t("empty")}>
          <p>{t("emptyHint")}</p>
          {canManage && (
            <Button className="mt-5" onClick={() => setCreating(true)}>
              <Plus aria-hidden />
              {t("new")}
            </Button>
          )}
        </EmptyState>
      ) : (
        <ProjectList projects={data.data} status={status} onStatus={setStatus} />
      )}

      {canManage && <ProjectFormDialog open={creating} onOpenChange={setCreating} />}
    </div>
  );
}

function ProjectList({ projects, status, onStatus }: { projects: Project[]; status?: ProjectStatus; onStatus: (s?: ProjectStatus) => void }) {
  const t = useTranslations("finance.projects");
  const ts = useTranslations("finance.projectStatus");
  const money = useMoney();
  const count = (s?: ProjectStatus) => (s ? projects.filter((p) => p.status === s).length : projects.length);
  const totalBudget = projects.reduce((sum, p) => sum + (p.budget ?? 0), 0);
  const order: ProjectStatus[] = ["active", "closed", "on_hold", "draft"];
  const shown = (status ? projects.filter((p) => p.status === status) : projects)
    .toSorted((a, b) => order.indexOf(a.status) - order.indexOf(b.status) || a.code.localeCompare(b.code));

  return (
    <>
      <section className="grid grid-cols-[repeat(auto-fit,minmax(min(10.5rem,100%),1fr))] overflow-hidden rounded-[18px] border border-hairline bg-canvas">
        {(["all", "active", "closed", "on_hold"] as const).map((key) => (
          <div key={key} className="flex flex-col gap-1 border-e border-hairline-soft px-6 py-5">
            <span className="text-[0.9375rem] font-medium text-slate">{key === "all" ? t("count") : ts(key)}</span>
            <span className="font-display text-[1.75rem] font-semibold tabular-nums text-ink sm:text-[2rem]">
              {count(key === "all" ? undefined : key)}
            </span>
          </div>
        ))}
        <div className="col-span-full flex flex-col gap-1 bg-night px-6 py-5 text-white sm:col-span-2 lg:col-span-1">
          <span className="text-[0.9375rem] font-medium text-white/80">{t("totalBudget")}</span>
          <span className="flex flex-wrap items-baseline font-display text-[1.5rem] font-semibold tabular-nums xl:text-[1.75rem]">
            {money.amount(totalBudget)}
            <span className="ms-1.5 font-sans text-[0.9375rem] font-normal text-white/80">{money.unit}</span>
          </span>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="radiogroup" aria-label={t("filter")} className="flex flex-wrap gap-2">
          {FILTERS.filter((f) => !f || count(f) > 0).map((value) => (
            <button
              key={value ?? "all"}
              type="button"
              role="radio"
              aria-checked={status === value}
              onClick={() => onStatus(value)}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-[0.9375rem] font-medium transition-colors duration-150",
                status === value ? "border-primary bg-primary text-on-primary" : "border-hairline-strong bg-canvas text-charcoal hover:border-[#9cc9b6]",
              )}
            >
              {value ? ts(value) : t("all")}
              <span className="font-display text-caption opacity-80">{count(value)}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-5 text-caption text-slate">
          <span className="inline-flex items-center gap-2">
            <span className="size-2.5 rounded-[3px] bg-brand-bar" />
            {t("legendSpent")}
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="size-2.5 rounded-[3px] bg-primary-soft shadow-[inset_0_0_0_1px_#b9d9cb]" />
            {t("legendLeft")}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3.5">
        {shown.map((project, index) => (
          <ProjectCard key={project.id} project={project} index={index} />
        ))}
      </div>
    </>
  );
}

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const t = useTranslations("finance.projects");
  const money = useMoney();
  const { organization } = useOrganization();
  const budget = project.budget ?? 0;
  const spent = project.spent ?? 0;
  const donors = (project.grants ?? []).map((g) => g.donor?.name).filter(Boolean).join("، ");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index, 8) * 0.04, ease: [0.2, 0, 0, 1] }}
    >
      <Link
        href={`/${organization.slug}/projects/${project.id}`}
        className="flex flex-wrap items-center gap-x-10 gap-y-5 rounded-[18px] border border-hairline bg-canvas px-5 py-5 transition-colors duration-150 hover:border-[#9cc9b6] sm:px-7 sm:py-6"
      >
        <div className="flex min-w-0 flex-[1_1_17rem] flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-display text-[1.125rem] font-semibold leading-snug text-ink sm:text-[1.25rem]">{project.name}</span>
            <ProjectPill status={project.status} />
          </div>
          <span className="text-[0.9375rem] text-slate">
            {[project.location, donors && t("fundedBy", { donors })].filter(Boolean).join(" · ")}
          </span>
        </div>

        <div className="flex min-w-0 flex-[2_1_22rem] flex-col gap-2.5">
          <Bar value={percentOf(spent, budget)} />
          <p className="text-[0.9375rem] text-ink sm:text-[1.0625rem]">
            {t.rich(project.status === "closed" ? "storyClosed" : "story", {
              spent: money.amount(spent),
              budget: money.amount(budget),
              left: money.amount(Math.max(0, budget - spent)),
              b: (chunk) => <b className="font-display font-semibold">{chunk}</b>,
            })}
          </p>
        </div>

        <div className="flex min-w-[4.5rem] flex-col items-center leading-snug">
          <span className="text-caption text-slate">{t("progress")}</span>
          <span className="font-display text-[1.375rem] font-semibold text-night dark:text-ink sm:text-[1.625rem]">
            {project.status === "on_hold" ? "—" : `${project.progress}%`}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
