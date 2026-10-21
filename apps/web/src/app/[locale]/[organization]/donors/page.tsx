"use client";

import { Globe2, Landmark, Plus } from "lucide-react";
import { motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { DonorFormDialog } from "@/features/donors/donor-form-dialog";
import { useDonors } from "@/features/donors/queries";
import { regionName } from "@/features/onboarding/options";
import { useOrganization } from "@/features/organization/organization-context";
import { cn } from "@/lib/cn";
import type { Donor, DonorType } from "@/lib/types";

// Notion-style category tints carry the donor type (DESIGN.md › Colour usage).
const TYPE_TINT: Record<DonorType, string> = {
  multilateral: "bg-tint-sky",
  bilateral: "bg-tint-lavender",
  foundation: "bg-tint-mint",
  government: "bg-tint-yellow",
  private: "bg-tint-peach",
  other: "bg-tint-gray",
};

export default function DonorsPage() {
  const t = useTranslations("donors");
  const locale = useLocale();
  const { can } = useOrganization();
  const { data, error, isPending, refetch } = useDonors();
  const [editing, setEditing] = useState<Donor | "new" | null>(null);
  const canManage = can("donors.manage");

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

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-40 rounded-md" />
          ))}
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : data.data.length === 0 ? (
        <EmptyState title={t("empty")}>
          <p>{t("emptyHint")}</p>
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.data.map((donor, index) => (
            <motion.button
              key={donor.id}
              type="button"
              disabled={!canManage}
              onClick={() => setEditing(donor)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.04, ease: [0.2, 0, 0, 1] }}
              className="flex flex-col items-start rounded-md border border-hairline bg-canvas p-6 text-start transition-[border-color,transform] duration-[120ms] enabled:hover:border-hairline-strong enabled:active:scale-[0.99]"
            >
              <span className={cn("grid size-11 place-items-center rounded-sm text-charcoal", TYPE_TINT[donor.type])}>
                <Landmark aria-hidden className="size-5" />
              </span>
              <h2 className="mt-4 text-h4">{donor.name}</h2>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-caption text-slate">
                <span className={cn("rounded-full px-2.5 py-0.5 text-charcoal", TYPE_TINT[donor.type])}>
                  {t(`types.${donor.type}`)}
                </span>
                {donor.country && (
                  <span className="inline-flex items-center gap-1">
                    <Globe2 aria-hidden className="size-3.5" />
                    {regionName(locale, donor.country)}
                  </span>
                )}
              </div>
              {donor.contact_email && (
                <p className="mt-3 text-caption text-steel" dir="ltr">
                  {donor.contact_email}
                </p>
              )}
            </motion.button>
          ))}
        </div>
      )}

      {canManage && (
        <DonorFormDialog
          donor={editing === "new" || editing === null ? undefined : editing}
          open={editing !== null}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
    </>
  );
}
