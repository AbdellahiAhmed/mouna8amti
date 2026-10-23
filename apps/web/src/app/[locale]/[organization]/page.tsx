"use client";

import {
  ArrowLeft,
  Bell,
  FolderKanban,
  Gauge,
  HandCoins,
  ReceiptText,
  Wallet,
} from "lucide-react";
import { motion } from "motion/react";
import { useNow, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { TopoLines } from "@/components/brand/topo-lines";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { useDashboard } from "@/features/finance/queries";
import {
  Bar,
  Card,
  CardHead,
  ExpensePill,
  useDates,
} from "@/features/finance/ui";
import { useOrganization } from "@/features/organization/organization-context";
import { Link } from "@/i18n/navigation";
import { percentOf, useMoney } from "@/lib/money";
import type { Dashboard, Project } from "@/lib/types";

const ease = [0.2, 0, 0, 1] as const;

export default function DashboardPage() {
  const t = useTranslations("finance.dashboard");
  const dashboard = useDashboard();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-[2rem] font-semibold leading-tight text-night dark:text-ink">
          {t("title")}
        </h1>
        <p className="mt-1 text-body-lg text-slate">{t("subtitle")}</p>
      </header>

      {dashboard.isPending ? (
        <DashboardSkeleton />
      ) : dashboard.error ? (
        <ErrorState
          error={dashboard.error}
          onRetry={() => dashboard.refetch()}
        />
      ) : (
        <DashboardContent data={dashboard.data.data} />
      )}
    </div>
  );
}

function DashboardContent({ data }: { data: Dashboard }) {
  const t = useTranslations("finance.dashboard");
  const money = useMoney();
  const { totals, projects } = data;
  const active = projects.filter((p) => p.status === "active").length;
  const closed = projects.filter((p) => p.status === "closed").length;
  const onHold = projects.filter((p) => p.status === "on_hold").length;
  const spentShare = percentOf(totals.spent, totals.received);

  return (
    <>
      <Hero data={data} active={active} spentShare={spentShare} />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(14rem,100%),1fr))] gap-4">
        <Stat
          icon={<HandCoins />}
          label={t("received")}
          value={money.amount(totals.received)}
          unit={money.unit}
          note={t("receivedNote", { promised: money.amount(totals.promised) })}
          delay={0}
        />
        <Stat
          icon={<ReceiptText />}
          label={t("spent")}
          value={money.amount(totals.spent)}
          unit={money.unit}
          note={t("spentNote", { percent: spentShare })}
          delay={0.05}
        />
        <Stat
          icon={<Wallet />}
          label={t("balance")}
          value={money.amount(totals.balance)}
          unit={money.unit}
          note={t("balanceNote")}
          delay={0.1}
        />
        <Stat
          icon={<FolderKanban />}
          label={t("activeProjects")}
          value={String(active)}
          unit={t("ofProjects", { count: projects.length })}
          note={t("projectsNote", { closed, onHold })}
          delay={0.15}
        />
      </div>

      <Attention data={data} />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(27rem,100%),1fr))] gap-6">
        <ProjectProgress projects={projects} />
        <RecentExpenses data={data} />
      </div>
    </>
  );
}

function Hero({
  data,
  active,
  spentShare,
}: {
  data: Dashboard;
  active: number;
  spentShare: number;
}) {
  const t = useTranslations("finance.dashboard");
  const money = useMoney();
  const dates = useDates();
  const { user } = useOrganization();
  const now = useNow();
  const hour = now.getHours();

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease }}
      className="relative overflow-hidden rounded-[22px] bg-night px-7 py-8 text-white sm:px-11 sm:py-10"
    >
      <TopoLines
        className="pointer-events-none absolute -end-32 -top-40 size-[35rem]"
        viewBox="-280 -280 560 560"
        clusters={[{ x: 0, y: 0, rings: 11 }]}
        opacity={0.09}
      />
      <div className="relative flex max-w-3xl flex-col gap-3">
        <span className="text-[0.9375rem] text-white/75">
          {dates.full(now.toISOString().slice(0, 10))}
        </span>
        <h2 className="font-display text-[1.65rem] font-semibold leading-snug text-white sm:text-[2.125rem]">
          {t(hour < 12 ? "morning" : "evening", {
            name: user.name.split(/\s+/)[0],
          })}
        </h2>
        <p className="text-[1.125rem] leading-[1.9] text-white/95 sm:text-[1.3rem]">
          {t.rich("story", {
            active,
            received: money.amount(data.totals.received),
            spent: money.amount(data.totals.spent),
            balance: money.amount(data.totals.balance),
            unit: money.unit,
            b: (chunk) => <b className="font-display font-semibold">{chunk}</b>,
          })}
        </p>
      </div>
      <div className="relative mt-6 flex max-w-3xl flex-col gap-2.5">
        <Bar value={spentShare} tone="light" className="h-2.5" />
        <div className="flex justify-between gap-3 text-[0.9375rem] text-white/80">
          <span>{t("spentShare", { percent: spentShare })}</span>
          <span>{t("leftShare", { percent: 100 - spentShare })}</span>
        </div>
      </div>
    </motion.section>
  );
}

function Stat({
  icon,
  label,
  value,
  unit,
  note,
  delay,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  unit: string;
  note: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease }}
      className="flex flex-col gap-2.5 rounded-[18px] border border-hairline bg-canvas p-5 sm:p-6"
    >
      <span className="flex items-center gap-3 font-medium text-charcoal">
        <span className="grid size-10 place-items-center rounded-xl bg-mist text-primary dark:bg-primary-soft [&_svg]:size-5">
          {icon}
        </span>
        {label}
      </span>
      <span className="font-display text-[1.75rem] font-semibold leading-tight text-ink tabular-nums sm:text-[2.125rem]">
        {value}
        <span className="ms-1.5 font-sans text-[0.9375rem] font-normal text-slate">
          {unit}
        </span>
      </span>
      <span className="text-[0.9375rem] text-slate">{note}</span>
    </motion.div>
  );
}

function Attention({ data }: { data: Dashboard }) {
  const t = useTranslations("finance.dashboard");
  const money = useMoney();
  const { organization } = useOrganization();
  const base = `/${organization.slug}`;
  const waiting = data.awaiting_me.review + data.awaiting_me.approve;

  const items: {
    key: string;
    title: string;
    detail: string;
    cta: string;
    href: string;
    icon: ReactNode;
  }[] = [];
  if (waiting > 0) {
    items.push({
      key: "waiting",
      icon: <Bell />,
      href: `${base}/expenses?status=pending`,
      cta: t("reviewNow"),
      title: t("waitingForYou", { count: waiting }),
      detail: t("waitingDetail", {
        count: data.totals.pending.count,
        amount: money.amount(data.totals.pending.amount),
        unit: money.unit,
      }),
    });
  }
  for (const project of data.projects) {
    const used = percentOf(project.spent ?? 0, project.budget ?? 0);
    if (project.status === "active" && used >= 80) {
      items.push({
        key: `budget-${project.id}`,
        icon: <Gauge />,
        href: `${base}/projects/${project.id}`,
        cta: t("openProject"),
        title: t("budgetHigh", { project: project.name, percent: used }),
        detail: t("budgetHighDetail", {
          spent: money.amount(project.spent ?? 0),
          budget: money.amount(project.budget ?? 0),
          unit: money.unit,
        }),
      });
    }
  }

  if (items.length === 0) return null;

  return (
    <Card>
      <CardHead
        title={
          <>
            {t("attention")}
            <span className="grid h-7 min-w-7 place-items-center rounded-full bg-primary px-2 font-display text-caption font-semibold text-on-primary">
              {items.length}
            </span>
          </>
        }
      />
      <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(min(17.5rem,100%),1fr))] gap-3">
        {items.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className="group flex flex-col gap-3 rounded-[14px] border border-hairline p-5 transition-colors duration-150 hover:border-[#9cc9b6] hover:bg-[#fbfdfc] dark:hover:bg-surface"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-mist text-primary dark:bg-primary-soft [&_svg]:size-5">
              {item.icon}
            </span>
            <span className="flex flex-col">
              <span className="text-[1.0625rem] font-semibold leading-relaxed text-ink">
                {item.title}
              </span>
              <span className="text-[0.9375rem] text-slate">{item.detail}</span>
            </span>
            <span className="mt-auto inline-flex items-center gap-1 text-[0.9375rem] font-medium text-primary">
              {item.cta}
              <ArrowLeft
                aria-hidden
                className="size-4 transition-transform duration-150 group-hover:-translate-x-0.5 ltr:rotate-180 ltr:group-hover:translate-x-0.5"
              />
            </span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

function ProjectProgress({ projects }: { projects: Project[] }) {
  const t = useTranslations("finance.dashboard");
  const { organization } = useOrganization();

  return (
    <Card>
      <CardHead title={t("projectsTitle")}>
        <Link
          href={`/${organization.slug}/projects`}
          className="text-[0.9375rem] font-medium text-primary hover:text-night"
        >
          {t("allProjects")}
        </Link>
      </CardHead>
      <div>
        {projects.map((project) => {
          const used = percentOf(project.spent ?? 0, project.budget ?? 0);
          const donors = (project.grants ?? [])
            .map((g) => g.donor?.name)
            .filter(Boolean)
            .join("، ");
          return (
            <div
              key={project.id}
              className="flex flex-col gap-2.5 border-t border-hairline-soft py-4 first-of-type:border-t-0"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <Link
                  href={`/${organization.slug}/projects/${project.id}`}
                  className="text-[1.0625rem] font-semibold text-ink hover:text-primary"
                >
                  {project.name}
                </Link>
                <span className="text-caption text-slate">
                  {[project.location, donors].filter(Boolean).join(" · ")}
                </span>
              </div>
              <Bar value={used} />
              <span className="text-[0.9375rem] text-charcoal">
                {project.status === "closed"
                  ? t("projectClosed")
                  : project.status === "on_hold"
                    ? t("projectOnHold", { percent: used })
                    : t("projectSpent", { percent: used })}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function RecentExpenses({ data }: { data: Dashboard }) {
  const t = useTranslations("finance.dashboard");
  const money = useMoney();
  const dates = useDates();
  const { organization } = useOrganization();

  return (
    <Card>
      <CardHead title={t("recentTitle")}>
        <Link
          href={`/${organization.slug}/expenses`}
          className="text-[0.9375rem] font-medium text-primary hover:text-night"
        >
          {t("allExpenses")}
        </Link>
      </CardHead>
      {data.recent_expenses.length === 0 && (
        <p className="py-6 text-body text-slate">{t("noExpenses")}</p>
      )}
      {data.recent_expenses.map((expense) => (
        <Link
          key={expense.id}
          href={`/${organization.slug}/expenses?open=${expense.id}`}
          className="flex items-center gap-4 border-t border-hairline-soft py-4 first-of-type:border-t-0 hover:bg-surface/60"
        >
          <span className="flex min-w-0 flex-1 flex-col leading-normal">
            <span className="truncate font-medium text-ink">
              {expense.description}
            </span>
            <span className="text-caption text-slate">
              {expense.project?.name} · {dates.dayMonth(expense.spent_on)}
            </span>
          </span>
          <span className="flex flex-col items-end gap-1">
            <span className="font-display text-[1.0625rem] font-semibold tabular-nums text-ink">
              {money.amount(expense.amount)}
            </span>
            <ExpensePill expense={expense} />
          </span>
        </Link>
      ))}
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status">
      <Skeleton className="h-64 rounded-[22px]" />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(14rem,100%),1fr))] gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-40 rounded-[18px]" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-[18px]" />
    </div>
  );
}
