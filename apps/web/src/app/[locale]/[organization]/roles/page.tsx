"use client";

import { ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/status-badge";
import { useRoles } from "@/features/organization/queries";
import type { Locale } from "@/lib/types";

export default function RolesPage() {
  const t = useTranslations("app.roles");
  const tp = useTranslations("permissions");
  const locale = useLocale() as Locale;
  const { data: roles, error, isPending, refetch } = useRoles();

  return (
    <>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      {isPending ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-48 rounded-md" />
          ))}
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((role, index) => (
            <motion.article
              key={role.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.04, ease: [0.2, 0, 0, 1] }}
              className="flex flex-col rounded-md border border-hairline bg-canvas p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-10 place-items-center rounded-sm bg-primary-soft text-primary">
                  <ShieldCheck aria-hidden className="size-5" />
                </span>
                {role.is_system && <StatusBadge tone="neutral">{t("system")}</StatusBadge>}
              </div>
              <h2 className="mt-4 text-h3">{role.name[locale]}</h2>
              <p className="mt-1 text-label text-steel">{t("permissionsCount", { count: role.permissions.length })}</p>
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {role.permissions.map((permission) => {
                  const key = permission.replace(".", "_") as Parameters<typeof tp>[0];
                  return (
                    <li key={permission} className="rounded-xs bg-surface-sunken px-2 py-0.5 text-caption text-charcoal">
                      {tp.has(key) ? tp(key) : permission}
                    </li>
                  );
                })}
              </ul>
            </motion.article>
          ))}
        </div>
      )}
    </>
  );
}
