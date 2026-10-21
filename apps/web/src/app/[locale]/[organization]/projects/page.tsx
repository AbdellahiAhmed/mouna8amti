"use client";

import { Plus, Search } from "lucide-react";
import { motion } from "motion/react";
import { useFormatter, useTranslations } from "next-intl";
import { useDeferredValue, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import { StatusBadge, type Tone } from "@/components/ui/status-badge";
import { useOrganization } from "@/features/organization/organization-context";
import { PROJECT_STATUSES, ProjectFormDialog } from "@/features/projects/project-form-dialog";
import { useProjects } from "@/features/projects/queries";
import { cn } from "@/lib/cn";
import type { Project, ProjectStatus } from "@/lib/types";

const PROJECT_TONE: Record<ProjectStatus, Tone> = {
  draft: "neutral",
  active: "success",
  on_hold: "warning",
  closed: "info",
};

export default function ProjectsPage() {
  const t = useTranslations("projects");
  const format = useFormatter();
  const { can } = useOrganization();
  const [status, setStatus] = useState<ProjectStatus | undefined>();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [editing, setEditing] = useState<Project | "new" | null>(null);
  const { data, error, isPending, refetch } = useProjects({ status, search: deferredSearch || undefined });
  const canManage = can("projects.manage");
  const isFiltered = Boolean(status || deferredSearch);

  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          canManage && (
            <Button onClick={() => setEditing("new")}>
              <Plus aria-hidden />
              {t("new")}
            </Button>
          )
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div role="radiogroup" aria-label={t("status")} className="inline-flex rounded-full bg-surface-sunken p-1">
          {[undefined, ...PROJECT_STATUSES].map((value) => (
            <button
              key={value ?? "all"}
              type="button"
              role="radio"
              aria-checked={status === value}
              onClick={() => setStatus(value)}
              className={cn(
                "relative rounded-full px-3.5 py-1.5 text-label font-medium transition-colors",
                status === value ? "text-ink" : "text-slate hover:text-ink",
              )}
            >
              {status === value && (
                <motion.span
                  layoutId="project-status-filter"
                  className="absolute inset-0 rounded-full bg-canvas shadow-[0_0_0_1px_var(--hairline)]"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              )}
              <span className="relative">{value ? t(`statuses.${value}`) : t("all")}</span>
            </button>
          ))}
        </div>

        <label className="relative ms-auto w-full sm:w-72">
          <span className="sr-only">{t("search")}</span>
          <Search aria-hidden className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-steel" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("search")} className="ps-9" />
        </label>
      </div>

      {isPending ? (
        <TableSkeleton />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : data.data.length === 0 ? (
        <EmptyState title={isFiltered ? t("noResults") : t("empty")}>
          {!isFiltered && (
            <>
              <p>{t("emptyHint")}</p>
              {canManage && (
                <Button className="mt-5" onClick={() => setEditing("new")}>
                  <Plus aria-hidden />
                  {t("new")}
                </Button>
              )}
            </>
          )}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-md border border-hairline bg-canvas">
          <table className="w-full min-w-[52rem] text-table">
            <thead className="bg-surface-sunken text-label text-slate">
              <tr>
                <th scope="col" className="px-5 py-3 text-start font-medium">{t("name")}</th>
                <th scope="col" className="px-5 py-3 text-start font-medium">{t("manager")}</th>
                <th scope="col" className="px-5 py-3 text-start font-medium">{t("period")}</th>
                <th scope="col" className="w-48 px-5 py-3 text-start font-medium">{t("progress")}</th>
                <th scope="col" className="px-5 py-3 text-start font-medium">{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((project, index) => (
                <motion.tr
                  key={project.id}
                  layout="position"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(index, 12) * 0.024 }}
                  onClick={canManage ? () => setEditing(project) : undefined}
                  className={cn(
                    "h-[60px] border-t border-hairline-soft transition-colors hover:bg-surface",
                    canManage && "cursor-pointer",
                  )}
                >
                  <td className="px-5">
                    <p className="font-medium text-ink">{project.name}</p>
                    <span className="inline-block font-mono text-caption text-steel" dir="ltr">
                      {project.code}
                    </span>
                  </td>
                  <td className="px-5 text-slate">{project.manager?.name ?? "—"}</td>
                  <td className="px-5 text-slate">
                    {format.dateTimeRange(new Date(project.starts_on), new Date(project.ends_on), {
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-5">
                    <div className="flex items-center gap-3">
                      <ProgressBar value={project.progress} label={t("progress")} className="flex-1" />
                      <span className="w-10 text-end text-label tabular-nums text-charcoal">{project.progress}%</span>
                    </div>
                  </td>
                  <td className="px-5">
                    <StatusBadge tone={PROJECT_TONE[project.status]}>{t(`statuses.${project.status}`)}</StatusBadge>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-hairline-soft px-5 py-3 text-caption text-steel">
            {t("count", { count: data.meta?.total ?? data.data.length })}
          </p>
        </div>
      )}

      {canManage && (
        <ProjectFormDialog
          project={editing === "new" || editing === null ? undefined : editing}
          open={editing !== null}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
    </>
  );
}
