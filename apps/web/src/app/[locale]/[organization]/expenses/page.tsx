"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { ExpenseDetail } from "@/features/finance/expense-detail";
import { ExpenseFormDialog } from "@/features/finance/expense-form-dialog";
import { useExpenses, useMonthlyReport, type ExpenseFilters } from "@/features/finance/queries";
import { Card, CardHead, ExpensePill, useDates } from "@/features/finance/ui";
import { useOrganization } from "@/features/organization/organization-context";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { useMoney } from "@/lib/money";
import type { MonthlyReport } from "@/lib/types";

const STATUS_FILTERS = [undefined, "pending", "approved", "rejected"] as const;

function shiftMonth(month: string, by: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return d.toISOString().slice(0, 7);
}

const desktop = "(min-width: 1024px)";
function useIsDesktop() {
  return useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia(desktop);
      query.addEventListener("change", notify);
      return () => query.removeEventListener("change", notify);
    },
    () => window.matchMedia(desktop).matches,
    () => true,
  );
}

export default function ExpensesPage() {
  const t = useTranslations("finance.expenses");
  const dates = useDates();
  const money = useMoney();
  const { can } = useOrganization();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const isDesktop = useIsDesktop();
  const [creating, setCreating] = useState(false);

  const month = params.get("month") ?? new Date().toISOString().slice(0, 7);
  const status = (params.get("status") ?? undefined) as ExpenseFilters["status"];
  const projectId = Number(params.get("project")) || undefined;
  const openId = Number(params.get("open")) || null;

  const setParam = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    router.replace(`${pathname}?${next}`, { scroll: false });
  };

  // "Waiting" ignores the month: a pending expense needs a decision whenever it was spent.
  const filters: ExpenseFilters = { status, project_id: projectId, month: status === "pending" ? undefined : month };
  const expenses = useExpenses(filters);
  const report = useMonthlyReport(month);
  const selected = openId ?? (isDesktop ? (expenses.data?.data[0]?.id ?? null) : null);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[2rem] font-semibold leading-tight text-night dark:text-ink">{t("title")}</h1>
          <p className="mt-1 text-body-lg text-slate">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex h-11 items-center rounded-xl border border-hairline-strong bg-canvas">
            <button type="button" className="grid h-full w-10 place-items-center text-slate hover:text-ink" aria-label={t("previousMonth")}
              onClick={() => setParam({ month: shiftMonth(month, -1), open: null })}>
              <ChevronRight aria-hidden className="size-4 ltr:rotate-180" />
            </button>
            <span className="min-w-32 text-center font-medium text-charcoal">{dates.monthYear(month)}</span>
            <button type="button" className="grid h-full w-10 place-items-center text-slate hover:text-ink disabled:opacity-30" aria-label={t("nextMonth")}
              disabled={month >= new Date().toISOString().slice(0, 7)}
              onClick={() => setParam({ month: shiftMonth(month, 1), open: null })}>
              <ChevronLeft aria-hidden className="size-4 ltr:rotate-180" />
            </button>
          </div>
          {can("expenses.create") && (
            <Button size="lg" onClick={() => setCreating(true)}>
              <Plus aria-hidden />
              {t("new")}
            </Button>
          )}
        </div>
      </header>

      <MonthSummary month={month} report={report.data?.data} />

      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("filter")}>
        {STATUS_FILTERS.map((value) => (
          <button
            key={value ?? "all"}
            type="button"
            role="radio"
            aria-checked={status === value}
            onClick={() => setParam({ status: value ?? null, open: null })}
            className={cn(
              "inline-flex min-h-10 items-center rounded-full border px-4 text-[0.9375rem] font-medium transition-colors duration-150",
              status === value ? "border-primary bg-primary text-on-primary" : "border-hairline-strong bg-canvas text-charcoal hover:border-[#9cc9b6]",
            )}
          >
            {t(`filters.${value ?? "all"}`)}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <Card className="p-0 sm:p-0">
          <div className="px-5 pt-5 sm:px-7 sm:pt-6">
            <CardHead title={status === "pending" ? t("pendingTitle") : t("listTitle", { month: dates.month(month) })}>
              {expenses.data && <span className="text-caption text-slate">{t("count", { count: expenses.data.meta?.total ?? 0 })}</span>}
            </CardHead>
          </div>
          {expenses.isPending ? (
            <div className="flex flex-col gap-3 p-5">
              {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : expenses.error ? (
            <div className="p-5"><ErrorState error={expenses.error} onRetry={() => expenses.refetch()} /></div>
          ) : expenses.data.data.length === 0 ? (
            <div className="p-5"><EmptyState title={t("empty")}>{t("emptyHint")}</EmptyState></div>
          ) : (
            <ul className="pb-2">
              {expenses.data.data.map((expense, index) => (
                <motion.li key={expense.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(index, 10) * 0.02 }}>
                  <button
                    type="button"
                    onClick={() => setParam({ open: String(expense.id) })}
                    aria-current={selected === expense.id}
                    className={cn(
                      "flex w-full items-center gap-4 border-t border-hairline-soft px-5 py-3.5 text-start transition-colors sm:px-7",
                      selected === expense.id ? "bg-mist dark:bg-surface" : "hover:bg-surface/70",
                    )}
                  >
                    <span className="flex w-12 shrink-0 flex-col items-center leading-tight">
                      <span className="font-display text-[1.25rem] font-semibold text-night dark:text-ink">{dates.day(expense.spent_on)}</span>
                      <span className="text-[0.75rem] text-slate">{dates.month(expense.spent_on)}</span>
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col leading-normal">
                      <span className="truncate font-medium text-ink">{expense.description}</span>
                      <span className="truncate text-caption text-slate">{expense.project?.name}</span>
                    </span>
                    <span className="flex flex-col items-end gap-1">
                      <span className="font-display text-[1.0625rem] font-semibold tabular-nums text-ink">{money.amount(expense.amount)}</span>
                      <ExpensePill expense={expense} />
                    </span>
                  </button>
                </motion.li>
              ))}
            </ul>
          )}
        </Card>

        {isDesktop ? (
          selected && (
            <Card className="sticky top-6">
              <ExpenseDetail key={selected} id={selected} onClosed={() => setParam({ open: null })} />
            </Card>
          )
        ) : (
          <Dialog open={selected !== null} onOpenChange={(open) => !open && setParam({ open: null })} title={t("detailTitle")}>
            {selected && <ExpenseDetail id={selected} onClosed={() => setParam({ open: null })} />}
          </Dialog>
        )}
      </div>

      {can("expenses.create") && <ExpenseFormDialog open={creating} onOpenChange={setCreating} />}
    </div>
  );
}

function MonthSummary({ month, report }: { month: string; report?: MonthlyReport }) {
  const t = useTranslations("finance.expenses");
  const money = useMoney();
  const dates = useDates();

  if (!report) {
    return (
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(13rem,100%),1fr))] gap-4">
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-32 rounded-[18px]" />)}
      </div>
    );
  }

  const total = report.spent.count + report.pending.count + report.rejected_count;
  const cards = [
    { label: t("spentInMonth", { month: dates.month(month) }), value: money.amount(report.spent.total), unit: money.unit, note: t("approvedOf", { approved: report.spent.count, total }), dark: true },
    { label: t("waiting"), value: String(report.pending.count), note: t("waitingWorth", { amount: money.amount(report.pending.amount), unit: money.unit }) },
    { label: t("approved"), value: String(report.spent.count), note: t("approvedNote") },
    { label: t("rejected"), value: String(report.rejected_count), note: t("rejectedNote") },
  ];

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(13rem,100%),1fr))] gap-4">
      {cards.map((card) => (
        <div key={card.label} className={cn("flex flex-col gap-1.5 rounded-[18px] border p-5 sm:p-6", card.dark ? "border-night bg-night text-white" : "border-hairline bg-canvas")}>
          <span className={cn("text-[0.9375rem] font-medium", card.dark ? "text-white/80" : "text-slate")}>{card.label}</span>
          <span className={cn("font-display text-[1.75rem] font-semibold tabular-nums sm:text-[2rem]", !card.dark && "text-ink")}>
            {card.value}
            {card.unit && <span className="ms-1.5 font-sans text-[0.9375rem] font-normal opacity-80">{card.unit}</span>}
          </span>
          <span className={cn("text-[0.9375rem]", card.dark ? "text-white/80" : "text-slate")}>{card.note}</span>
        </div>
      ))}
    </div>
  );
}
