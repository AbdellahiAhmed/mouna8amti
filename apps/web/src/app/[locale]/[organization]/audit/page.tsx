"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useState } from "react";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import { ChangeRow } from "@/features/audit/change-value";
import { useAuditTrail } from "@/features/audit/queries";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { AuditLog, AuditSubjectType } from "@/lib/types";

const FILTERS: (AuditSubjectType | undefined)[] = [undefined, "project", "donor", "membership", "role", "organization"];

const EVENT_STYLE = {
  created: { icon: Plus, className: "bg-success text-white" },
  updated: { icon: Pencil, className: "bg-info text-white" },
  deleted: { icon: Trash2, className: "bg-danger text-white" },
} as const;

export default function AuditPage() {
  const t = useTranslations("app.audit");
  const [subject, setSubject] = useState<AuditSubjectType | undefined>();
  const trail = useAuditTrail(subject);
  const entries = trail.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div role="radiogroup" aria-label={t("title")} className="mb-6 inline-flex flex-wrap rounded-full bg-surface-sunken p-1">
        {FILTERS.map((value) => (
          <button
            key={value ?? "all"}
            type="button"
            role="radio"
            aria-checked={subject === value}
            onClick={() => setSubject(value)}
            className={cn(
              "relative rounded-full px-3.5 py-1.5 text-label font-medium transition-colors",
              subject === value ? "text-ink" : "text-slate hover:text-ink",
            )}
          >
            {subject === value && (
              <motion.span
                layoutId="audit-filter"
                className="absolute inset-0 rounded-full bg-canvas shadow-[0_0_0_1px_var(--hairline)]"
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
              />
            )}
            <span className="relative">{t(`filters.${value ?? "all"}`)}</span>
          </button>
        ))}
      </div>

      {trail.isPending ? (
        <TableSkeleton rows={8} />
      ) : trail.error instanceof ApiError && trail.error.status === 403 ? (
        <EmptyState title={t("forbidden")} />
      ) : trail.error ? (
        <ErrorState error={trail.error} onRetry={() => trail.refetch()} />
      ) : entries.length === 0 ? (
        <EmptyState title={subject ? t("emptyFiltered") : t("empty")} />
      ) : (
        <div className="flex flex-col gap-8">
          {groupByDay(entries).map(([day, dayEntries]) => (
            <DayGroup key={day} day={day} entries={dayEntries} />
          ))}

          {trail.hasNextPage && (
            <Button
              variant="secondary"
              className="self-center"
              disabled={trail.isFetchingNextPage}
              onClick={() => trail.fetchNextPage()}
            >
              {trail.isFetchingNextPage ? t("loadingMore") : t("loadMore")}
            </Button>
          )}
        </div>
      )}
    </>
  );
}

function DayGroup({ day, entries }: { day: string; entries: AuditLog[] }) {
  const t = useTranslations("app.audit");
  const format = useFormatter();
  const date = new Date(`${day}T00:00:00`);
  const now = useNow();
  const today = localDay(now);
  const yesterday = localDay(new Date(now.getTime() - 86_400_000));
  const heading =
    day === today ? t("today") : day === yesterday ? t("yesterday") : format.dateTime(date, { dateStyle: "full" });

  return (
    <section>
      <h2 className="mb-3 text-label font-medium text-steel">{heading}</h2>
      <ol className="rounded-md border border-hairline bg-canvas">
        {entries.map((entry, index) => (
          <Entry key={entry.id} entry={entry} index={index} isLast={index === entries.length - 1} />
        ))}
      </ol>
    </section>
  );
}

function Entry({ entry, index, isLast }: { entry: AuditLog; index: number; isLast: boolean }) {
  const t = useTranslations("app.audit");
  const format = useFormatter();
  const { icon: Icon, className } = EVENT_STYLE[entry.event];
  const actor = entry.actor?.name ?? t("system");
  const sentenceKey = `sentences.${entry.subject.type}.${entry.event}` as Parameters<typeof t>[0];

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: Math.min(index, 12) * 0.024, ease: [0.2, 0, 0, 1] }}
      className="relative flex gap-4 border-t border-hairline-soft px-5 py-4 first:border-t-0"
    >
      {/* Timeline spine linking consecutive events of the same day. */}
      {!isLast && <span aria-hidden className="absolute bottom-0 top-14 start-[2.4rem] w-px bg-hairline" />}

      <span className="relative shrink-0 self-start">
        {entry.actor ? (
          <span className="grid size-10 place-items-center rounded-full bg-primary-soft font-display text-label font-semibold text-primary">
            {initials(entry.actor.name)}
          </span>
        ) : (
          <span className="grid size-10 place-items-center rounded-full bg-surface-sunken">
            <LogoMark className="h-3.5" />
          </span>
        )}
        <span className={cn("absolute -bottom-1 -end-1 grid size-5 place-items-center rounded-full ring-2 ring-canvas", className)}>
          <Icon aria-hidden className="size-3" strokeWidth={3} />
        </span>
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-body text-charcoal">
          {t.has(sentenceKey)
            ? t.rich(sentenceKey, {
                actor,
                label: entry.subject.label ?? t("unnamed"),
                b: (chunks) => <strong className="font-semibold text-ink">{chunks}</strong>,
              })
            : actor}
        </p>

        {entry.changes.length > 0 && (
          <ul className="mt-3 flex flex-col gap-2 rounded-sm bg-surface px-4 py-3">
            {entry.changes.map((change) => (
              <ChangeRow key={change.field} change={change} subject={entry.subject.type} />
            ))}
          </ul>
        )}
      </div>

      <time
        dateTime={entry.created_at}
        title={format.dateTime(new Date(entry.created_at), { dateStyle: "full", timeStyle: "short" })}
        className="shrink-0 pt-0.5 text-caption tabular-nums text-steel"
      >
        {format.dateTime(new Date(entry.created_at), { timeStyle: "short" })}
      </time>
    </motion.li>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

function localDay(date: Date): string {
  return date.toLocaleDateString("en-CA"); // YYYY-MM-DD in the viewer's timezone
}

function groupByDay(entries: AuditLog[]): [string, AuditLog[]][] {
  const groups = new Map<string, AuditLog[]>();
  for (const entry of entries) {
    const day = localDay(new Date(entry.created_at));
    groups.set(day, [...(groups.get(day) ?? []), entry]);
  }
  return [...groups];
}
