"use client";

import { FilePlus2, FilePen, FileX2 } from "lucide-react";
import { motion } from "motion/react";
import { useFormatter, useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import { useAuditLogs } from "@/features/organization/queries";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { AuditLog } from "@/lib/types";

const EVENT_STYLE: Record<AuditLog["event"], { icon: typeof FilePlus2; className: string }> = {
  created: { icon: FilePlus2, className: "bg-success-soft text-success" },
  updated: { icon: FilePen, className: "bg-info-soft text-info" },
  deleted: { icon: FileX2, className: "bg-danger-soft text-danger" },
};

export default function AuditPage() {
  const t = useTranslations("app.audit");
  const tsub = useTranslations("subjects");
  const format = useFormatter();
  const { data, error, isPending, refetch } = useAuditLogs();

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      {isPending ? (
        <TableSkeleton rows={8} />
      ) : error instanceof ApiError && error.status === 403 ? (
        <EmptyState title={t("forbidden")} />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : data.data.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <ol className="relative flex flex-col rounded-md border border-hairline bg-canvas">
          {data.data.map((entry, index) => {
            const { icon: Icon, className } = EVENT_STYLE[entry.event];
            const subject = entry.subject.type as Parameters<typeof tsub>[0];
            const fields = Object.keys(entry.new_values ?? entry.old_values ?? {}).filter((f) => f !== "id");

            return (
              <motion.li
                key={entry.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: Math.min(index, 12) * 0.024, ease: [0.2, 0, 0, 1] }}
                className="flex gap-4 border-t border-hairline-soft px-5 py-4 first:border-t-0"
              >
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", className)}>
                  <Icon aria-hidden className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-body text-charcoal">
                    <span className="font-medium text-ink">{entry.actor?.name ?? t("system")}</span>{" "}
                    {t(entry.event)}{" "}
                    {tsub.has(subject) ? tsub(subject) : entry.subject.type}{" "}
                    <span className="text-steel" dir="ltr">
                      #{entry.subject.id}
                    </span>
                  </p>
                  {fields.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {fields.slice(0, 8).map((field) => (
                        <li key={field} className="rounded-xs bg-surface-sunken px-2 py-0.5 font-mono text-caption text-slate" dir="ltr">
                          {field}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <time dateTime={entry.created_at} className="shrink-0 text-caption text-steel" title={format.dateTime(new Date(entry.created_at), { dateStyle: "full", timeStyle: "medium" })}>
                  {format.relativeTime(new Date(entry.created_at))}
                </time>
              </motion.li>
            );
          })}
        </ol>
      )}
    </>
  );
}
