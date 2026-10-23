"use client";

import { HandCoins, Pencil, Plus } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { DonorFormDialog } from "@/features/donors/donor-form-dialog";
import { useDonors } from "@/features/donors/queries";
import { DonorReportsCard } from "@/features/finance/donor-reports-card";
import { GrantFormDialog } from "@/features/finance/grant-form-dialog";
import { Bar, Card, initialOf, useDates } from "@/features/finance/ui";
import { useOrganization } from "@/features/organization/organization-context";
import { Link } from "@/i18n/navigation";
import { percentOf, useMoney } from "@/lib/money";
import type { Donor, GrantTranche } from "@/lib/types";

/** The earliest tranche still awaited across a set of grants. */
function nextTranche(donors: Donor[]): GrantTranche | undefined {
  return donors
    .flatMap((d) => d.grants ?? [])
    .flatMap((g) => g.tranches ?? [])
    .filter((tr) => !tr.received_on)
    .toSorted((a, b) => a.expected_on.localeCompare(b.expected_on))[0];
}

export default function DonorsPage() {
  const t = useTranslations("finance.donors");
  const { can } = useOrganization();
  const { data, error, isPending, refetch } = useDonors();
  const [editingDonor, setEditingDonor] = useState<Donor | "new" | null>(null);
  const [grantFor, setGrantFor] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[2rem] font-semibold leading-tight text-night dark:text-ink">{t("title")}</h1>
          <p className="mt-1 text-body-lg text-slate">{t("subtitle")}</p>
        </div>
        {can("donors.manage") && (
          <Button variant="secondary" onClick={() => setEditingDonor("new")}>
            <Plus aria-hidden />
            {t("new")}
          </Button>
        )}
      </header>

      {isPending ? (
        <div className="flex flex-col gap-6" role="status">
          <Skeleton className="h-52 rounded-[18px]" />
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-72 rounded-[18px]" />)}
          </div>
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : data.data.length === 0 ? (
        <EmptyState title={t("empty")}>{t("emptyHint")}</EmptyState>
      ) : (
        <DonorBoard donors={data.data} onEdit={setEditingDonor} onAddGrant={setGrantFor} />
      )}

      {can("donors.manage") && (
        <DonorFormDialog
          donor={editingDonor === "new" || editingDonor === null ? undefined : editingDonor}
          open={editingDonor !== null}
          onOpenChange={(open) => !open && setEditingDonor(null)}
        />
      )}
      {can("grants.manage") && (
        <GrantFormDialog defaults={{ donor_id: grantFor ?? undefined }} open={grantFor !== null} onOpenChange={(open) => !open && setGrantFor(null)} />
      )}
    </div>
  );
}

function DonorBoard({ donors, onEdit, onAddGrant }: { donors: Donor[]; onEdit: (d: Donor) => void; onAddGrant: (id: number) => void }) {
  const t = useTranslations("finance.donors");
  const money = useMoney();
  const dates = useDates();
  const promised = donors.reduce((sum, d) => sum + (d.promised ?? 0), 0);
  const received = donors.reduce((sum, d) => sum + (d.received ?? 0), 0);
  const next = nextTranche(donors);
  const funding = donors.filter((d) => (d.grants ?? []).length > 0);
  const others = donors.filter((d) => (d.grants ?? []).length === 0);

  return (
    <>
      <Card className="flex flex-col gap-5">
        <p className="max-w-4xl text-[1.1875rem] leading-[1.9] text-ink sm:text-[1.3rem]">
          {t.rich("summary", {
            promised: money.amount(promised),
            received: money.amount(received),
            left: money.amount(promised - received),
            unit: money.unit,
            b: (chunk) => <b className="font-display font-semibold text-night dark:text-ink">{chunk}</b>,
          })}
        </p>
        <div className="flex flex-col gap-2">
          <Bar value={percentOf(received, promised)} className="h-2.5" />
          <div className="flex flex-wrap justify-between gap-2 text-[0.9375rem] text-slate">
            <span>{t("receivedShare", { percent: percentOf(received, promised) })}</span>
            {next && <span>{t("nextTranche", { date: dates.full(next.expected_on) })}</span>}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            [t("promised"), promised],
            [t("received"), received],
            [t("left"), promised - received],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-[14px] bg-mist px-4 py-3 dark:bg-surface">
              <span className="text-caption text-slate">{label}</span>
              <span className="block font-display text-[1.25rem] font-semibold text-ink sm:text-[1.5rem]">{money.compact(value as number)}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(24rem,100%),1fr))] gap-4">
        {funding.map((donor, index) => (
          <DonorCard key={donor.id} donor={donor} index={index} onEdit={onEdit} onAddGrant={onAddGrant} />
        ))}
      </div>

      <DonorReportsCard donors={donors} />

      {others.length > 0 && (
        <Card>
          <h2 className="mb-2 font-display text-[1.125rem] font-semibold text-ink">{t("withoutGrant")}</h2>
          {others.map((donor) => (
            <div key={donor.id} className="flex items-center justify-between gap-3 border-t border-hairline-soft py-3 first-of-type:border-t-0">
              <span className="font-medium text-ink">{donor.name}</span>
              <DonorActions donor={donor} onEdit={onEdit} onAddGrant={onAddGrant} />
            </div>
          ))}
        </Card>
      )}
    </>
  );
}

function DonorActions({ donor, onEdit, onAddGrant }: { donor: Donor; onEdit: (d: Donor) => void; onAddGrant: (id: number) => void }) {
  const t = useTranslations("finance.donors");
  const { can } = useOrganization();
  return (
    <div className="flex items-center gap-1">
      {can("grants.manage") && (
        <Button variant="ghost" size="icon" aria-label={t("addGrant")} onClick={() => onAddGrant(donor.id)}>
          <HandCoins aria-hidden />
        </Button>
      )}
      {can("donors.manage") && (
        <Button variant="ghost" size="icon" aria-label={t("edit")} onClick={() => onEdit(donor)}>
          <Pencil aria-hidden />
        </Button>
      )}
    </div>
  );
}

function DonorCard({ donor, index, onEdit, onAddGrant }: { donor: Donor; index: number; onEdit: (d: Donor) => void; onAddGrant: (id: number) => void }) {
  const t = useTranslations("finance.donors");
  const money = useMoney();
  const dates = useDates();
  const { organization } = useOrganization();
  const grants = donor.grants ?? [];
  const promised = donor.promised ?? 0;
  const received = donor.received ?? 0;
  const next = nextTranche([donor]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index, 8) * 0.05, ease: [0.2, 0, 0, 1] }}
      className="flex flex-col gap-4 rounded-[18px] border border-hairline bg-canvas p-5 sm:p-7"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-primary-soft font-display text-[1.125rem] font-semibold text-primary">
            {initialOf(donor.name)}
          </span>
          <div className="leading-snug">
            <h2 className="font-display text-[1.1875rem] font-semibold text-ink">{donor.name}</h2>
            <span className="text-caption text-slate">{t("funds", { count: grants.length })}</span>
          </div>
        </div>
        <DonorActions donor={donor} onEdit={onEdit} onAddGrant={onAddGrant} />
      </div>

      <p className="text-[1.0625rem] text-ink">
        {t.rich("line", {
          received: money.amount(received),
          promised: money.amount(promised),
          b: (chunk) => <b className="font-display font-semibold">{chunk}</b>,
        })}
      </p>
      <Bar value={percentOf(received, promised)} />

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          [t("promised"), promised],
          [t("received"), received],
          [t("left"), promised - received],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-xl bg-surface px-2 py-2.5">
            <span className="block text-caption text-slate">{label}</span>
            <span className="font-display font-semibold tabular-nums text-ink">{money.amount(value as number)}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-caption text-slate">{t("projects")}</span>
        {grants.map((g) =>
          g.project ? (
            <Link
              key={g.id}
              href={`/${organization.slug}/projects/${g.project.id}`}
              className="rounded-full bg-mist px-3 py-1 text-caption font-medium text-primary hover:bg-primary-soft dark:bg-surface"
            >
              {g.project.name}
            </Link>
          ) : null,
        )}
      </div>

      <div className="mt-auto rounded-[14px] border border-hairline-soft px-4 py-3">
        <span className="block text-caption text-slate">{t("next")}</span>
        <span className="font-medium text-ink">
          {next ? t("nextValue", { amount: money.amount(next.amount), unit: money.unit, date: dates.full(next.expected_on) }) : t("nothingLeft")}
        </span>
      </div>
    </motion.section>
  );
}
