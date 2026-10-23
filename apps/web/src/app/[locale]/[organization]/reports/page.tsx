"use client";

import { ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { useMonthlyReport } from "@/features/finance/queries";
import { Card, CardHead, useDates } from "@/features/finance/ui";
import { useOrganization } from "@/features/organization/organization-context";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { useMoney } from "@/lib/money";
import type { MonthlyReport } from "@/lib/types";

function shiftMonth(month: string, by: number) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + by, 1)).toISOString().slice(0, 7);
}

export default function ReportsPage() {
  const t = useTranslations("finance.reports");
  const dates = useDates();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const current = new Date().toISOString().slice(0, 7);
  const month = params.get("month") ?? current;
  const report = useMonthlyReport(month);
  const go = (by: number) => router.replace(`${pathname}?month=${shiftMonth(month, by)}`, { scroll: false });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div>
          <h1 className="font-display text-[2rem] font-semibold leading-tight text-night dark:text-ink">{t("title")}</h1>
          <p className="mt-1 text-body-lg text-slate">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex h-11 items-center rounded-xl border border-hairline-strong bg-canvas">
            <button type="button" className="grid h-full w-10 place-items-center text-slate hover:text-ink" aria-label={t("previousMonth")} onClick={() => go(-1)}>
              <ChevronRight aria-hidden className="size-4 ltr:rotate-180" />
            </button>
            <span className="min-w-32 text-center font-medium text-charcoal">{dates.monthYear(month)}</span>
            <button type="button" className="grid h-full w-10 place-items-center text-slate hover:text-ink disabled:opacity-30" aria-label={t("nextMonth")} disabled={month >= current} onClick={() => go(1)}>
              <ChevronLeft aria-hidden className="size-4 ltr:rotate-180" />
            </button>
          </div>
          <Button size="lg" variant="secondary" onClick={() => window.print()}>
            <Printer aria-hidden />
            {t("print")}
          </Button>
        </div>
      </header>

      {report.isPending ? (
        <div className="flex flex-col gap-6" role="status">
          <Skeleton className="h-72 rounded-[22px]" />
          <Skeleton className="h-80 rounded-[18px]" />
        </div>
      ) : report.error ? (
        <ErrorState error={report.error} onRetry={() => report.refetch()} />
      ) : (
        <Report report={report.data.data} />
      )}
    </div>
  );
}

function Report({ report }: { report: MonthlyReport }) {
  const t = useTranslations("finance.reports");
  const locale = useLocale();
  const money = useMoney();
  const dates = useDates();
  const { organization } = useOrganization();
  const list = new Intl.ListFormat(locale, { type: "conjunction" });
  const month = dates.monthYear(report.month);
  const net = report.received.total - report.spent.total;
  const b = (chunk: ReactNode) => <b className="font-display font-semibold text-night dark:text-ink">{chunk}</b>;

  return (
    <>
      <section className="rounded-[22px] border border-hairline bg-canvas p-6 sm:p-10 print:border-0 print:p-0">
        <span className="text-caption font-medium uppercase tracking-wide text-primary">
          {t("eyebrow", { organization: organization.name, month })}
        </span>
        <p className="mt-4 max-w-4xl text-[1.1875rem] leading-[2] text-ink sm:text-[1.375rem]">
          {report.received.total > 0
            ? t.rich("received", {
                month,
                amount: money.amount(report.received.total),
                unit: money.unit,
                donors: list.format(report.received.by_donor.map((d) => d.donor)),
                b,
              })
            : t.rich("receivedNone", { month, b })}{" "}
          {report.spent.total > 0
            ? t.rich("spent", {
                amount: money.amount(report.spent.total),
                unit: money.unit,
                count: report.spent.count,
                detail: list.format(report.spent.by_project.map((p) => t("forProject", { amount: money.amount(p.amount), project: p.project.name }))),
                b,
              })
            : t("spentNone")}{" "}
          {report.pending.count > 0 && t.rich("pending", { count: report.pending.count, amount: money.amount(report.pending.amount), unit: money.unit, b })}{" "}
          {t.rich("balance", { amount: money.amount(report.balance_at_end), unit: money.unit, b })}
        </p>

        <div className="mt-8 grid grid-cols-[repeat(auto-fit,minmax(min(12rem,100%),1fr))] gap-3">
          {[
            { label: t("figReceived"), value: report.received.total, swatch: "bg-[#157a5c] dark:bg-[#5fbf9f]" },
            { label: t("figSpent"), value: report.spent.total, swatch: "bg-[#6db89a] dark:bg-[#2e6e58]" },
            { label: net >= 0 ? t("figNetUp") : t("figNetDown"), value: Math.abs(net), swatch: "bg-hairline-strong" },
          ].map((fig) => (
            <div key={fig.label} className="rounded-[14px] bg-mist px-5 py-4 dark:bg-surface">
              <span className="flex items-center gap-2 text-caption text-slate">
                <span aria-hidden className={cn("size-2.5 rounded-[3px]", fig.swatch)} />
                {fig.label}
              </span>
              <span className="mt-1 block font-display text-[1.5rem] font-semibold tabular-nums text-ink">
                {money.amount(fig.value)}
                <span className="ms-1.5 font-sans text-caption font-normal text-slate">{money.unit}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <SixMonths report={report} />
    </>
  );
}

/** Received vs spent per month, one shared money axis; hover or focus a bar for its value. */
function SixMonths({ report }: { report: MonthlyReport }) {
  const t = useTranslations("finance.reports");
  const money = useMoney();
  const dates = useDates();
  const [active, setActive] = useState<{ month: string; kind: "received" | "spent" } | null>(null);
  const max = Math.max(1, ...report.series.flatMap((s) => [s.received, s.spent]));
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const last = report.series.at(-1);

  return (
    <Card>
      <CardHead title={t("sixMonths")}>
        <div className="flex items-center gap-4 text-caption text-slate">
          <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-[3px] bg-[#157a5c] dark:bg-[#5fbf9f]" />{t("legendReceived")}</span>
          <span className="inline-flex items-center gap-2"><span className="size-2.5 rounded-[3px] bg-[#6db89a] dark:bg-[#2e6e58]" />{t("legendSpent")}</span>
        </div>
      </CardHead>

      <div className="mt-4 flex gap-3">
        <div className="relative flex h-64 w-14 shrink-0 flex-col-reverse justify-between text-end text-[0.75rem] tabular-nums text-steel">
          {ticks.map((tick) => <span key={tick} className="-my-2">{money.compact(tick)}</span>)}
        </div>
        <div className="relative h-64 flex-1">
          {ticks.map((tick) => (
            <span key={tick} aria-hidden className="absolute inset-x-0 border-t border-hairline-soft" style={{ bottom: `${(tick / top) * 100}%` }} />
          ))}
          <div className="absolute inset-0 grid grid-cols-6 gap-2">
            {report.series.map((s) => (
              <div key={s.month} className="flex items-end justify-center gap-[2px]">
                {(["received", "spent"] as const).map((kind) => {
                  const isActive = active?.month === s.month && active.kind === kind;
                  return (
                    <button
                      key={kind}
                      type="button"
                      aria-label={`${dates.monthYear(s.month)} · ${t(kind === "received" ? "legendReceived" : "legendSpent")}: ${money.amount(s[kind])} ${money.unit}`}
                      onMouseEnter={() => setActive({ month: s.month, kind })}
                      onMouseLeave={() => setActive(null)}
                      onFocus={() => setActive({ month: s.month, kind })}
                      onBlur={() => setActive(null)}
                      className="group relative flex h-full w-[38%] max-w-9 items-end"
                    >
                      <span
                        className={cn(
                          "relative block w-full rounded-t-[4px] transition-opacity duration-150",
                          kind === "received" ? "bg-[#157a5c] dark:bg-[#5fbf9f]" : "bg-[#6db89a] dark:bg-[#2e6e58]",
                          active && !isActive && "opacity-45",
                        )}
                        style={{ height: `${(s[kind] / top) * 100}%`, minHeight: s[kind] > 0 ? 2 : 0 }}
                      >
                        {isActive && (
                          <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-sm bg-ink px-2.5 py-1.5 text-caption text-canvas shadow-float">
                            {money.amount(s[kind])} {money.unit}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="ms-[4.25rem] mt-2 grid grid-cols-6 gap-2 text-center text-caption text-slate">
        {report.series.map((s) => (
          <span key={s.month} className={s.month === report.month ? "font-semibold text-ink" : undefined}>{dates.month(s.month)}</span>
        ))}
      </div>

      {last && (
        <p className="mt-5 border-t border-hairline-soft pt-4 text-body text-charcoal">
          {t("chartNote", { month: dates.month(last.month), received: money.compact(last.received), spent: money.compact(last.spent), balance: money.compact(report.balance_at_end) })}
        </p>
      )}

      <details className="mt-3 print:hidden">
        <summary className="cursor-pointer text-caption font-medium text-primary">{t("tableView")}</summary>
        <table className="mt-3 w-full text-start text-body">
          <thead className="text-caption text-slate">
            <tr>
              <th className="py-2 text-start font-medium">{t("month")}</th>
              <th className="py-2 text-end font-medium">{t("legendReceived")}</th>
              <th className="py-2 text-end font-medium">{t("legendSpent")}</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {report.series.map((s) => (
              <tr key={s.month} className="border-t border-hairline-soft">
                <td className="py-2">{dates.monthYear(s.month)}</td>
                <td className="py-2 text-end">{money.amount(s.received)}</td>
                <td className="py-2 text-end">{money.amount(s.spent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </Card>
  );
}

/** 1, 2 or 5 × 10ⁿ in minor units, so the axis reads "1 M, 2 M, 3 M". */
function niceStep(max: number) {
  const raw = max / 4;
  const power = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * power).find((s) => s >= raw) ?? power * 10;
}
