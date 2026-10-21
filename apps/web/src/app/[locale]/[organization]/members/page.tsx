"use client";

import { motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import { StatusBadge, type Tone } from "@/components/ui/status-badge";
import { useMembers } from "@/features/organization/queries";
import type { Locale, MembershipStatus } from "@/lib/types";

const STATUS_TONE: Record<MembershipStatus, Tone> = { active: "success", invited: "warning", suspended: "danger" };

export default function MembersPage() {
  const t = useTranslations("app.members");
  const ts = useTranslations("app.status");
  const locale = useLocale() as Locale;
  const { data, error, isPending, refetch } = useMembers();

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      {isPending ? (
        <TableSkeleton />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : data.data.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <div className="overflow-x-auto rounded-md border border-hairline bg-canvas">
          <table className="w-full min-w-[40rem] text-table">
            <thead className="bg-surface-sunken text-start text-label text-slate">
              <tr>
                <th scope="col" className="px-5 py-3 text-start font-medium">{t("name")}</th>
                <th scope="col" className="px-5 py-3 text-start font-medium">{t("email")}</th>
                <th scope="col" className="px-5 py-3 text-start font-medium">{t("roles")}</th>
                <th scope="col" className="px-5 py-3 text-start font-medium">{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {data.data.map((member, index) => (
                <motion.tr
                  key={member.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(index, 12) * 0.024 }}
                  className="h-[52px] border-t border-hairline-soft transition-colors hover:bg-surface"
                >
                  <td className="px-5 font-medium text-ink">{member.user?.name}</td>
                  <td className="px-5 text-slate" dir="ltr">
                    <span className="block text-start rtl:text-end">{member.user?.email}</span>
                  </td>
                  <td className="px-5">
                    <span className="flex flex-wrap gap-1.5">
                      {member.roles?.map((role) => (
                        <span key={role.id} className="rounded-xs bg-tint-lavender px-2 py-0.5 text-caption text-charcoal">
                          {role.name[locale]}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td className="px-5">
                    <StatusBadge tone={STATUS_TONE[member.status]}>{ts(member.status)}</StatusBadge>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
