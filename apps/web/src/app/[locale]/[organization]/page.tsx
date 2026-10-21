"use client";

import { Check } from "lucide-react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { StarField } from "@/components/brand/star-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { useOrganization } from "@/features/organization/organization-context";
import { cn } from "@/lib/cn";

type Step = { key: "stepOrg" | "stepTeam" | "stepProject" | "stepBudget"; state: "done" | "next" | "soon" };

// Reflects what the product can do today: team invitations and projects arrive in the next phases.
const STEPS: Step[] = [
  { key: "stepOrg", state: "done" },
  { key: "stepTeam", state: "next" },
  { key: "stepProject", state: "soon" },
  { key: "stepBudget", state: "soon" },
];

export default function DashboardPage() {
  const t = useTranslations("app.dashboard");
  const tn = useTranslations("app.nav");
  const { user, organization } = useOrganization();
  const firstName = user.name.split(/\s+/)[0];

  return (
    <div className="flex flex-col gap-8">
      <section className="relative overflow-hidden rounded-lg bg-night px-8 py-12 text-white sm:px-12">
        <StarField className="pointer-events-none absolute inset-0 text-white/[0.06]" />
        <div className="relative max-w-2xl">
          <h1 className="text-display-lg tracking-[-0.8px] text-white">{t("greeting", { name: firstName })}</h1>
          <p className="mt-3 text-body-lg text-white/70">{t("subtitle", { organization: organization.name })}</p>
        </div>
      </section>

      <section className="rounded-md border border-hairline bg-canvas p-6 sm:p-8">
        <h2 className="text-h3">{t("checklistTitle")}</h2>
        <ol className="mt-6 flex flex-col">
          {STEPS.map((step, index) => (
            <motion.li
              key={step.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: index * 0.06, ease: [0.2, 0, 0, 1] }}
              className="flex items-center gap-4 border-t border-hairline-soft py-4 first:border-t-0"
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-full font-display text-label",
                  step.state === "done" ? "bg-primary text-on-primary" : "bg-surface-sunken text-slate",
                )}
              >
                {step.state === "done" ? <Check aria-hidden className="size-4" /> : index + 1}
              </span>
              <span className={cn("flex-1 text-body", step.state === "done" ? "text-steel line-through" : "text-ink")}>
                {t(step.key)}
              </span>
              {step.state === "done" && <StatusBadge tone="success">{t("done")}</StatusBadge>}
              {step.state === "next" && <StatusBadge tone="primary">{t("next")}</StatusBadge>}
              {step.state === "soon" && <StatusBadge tone="neutral">{tn("soon")}</StatusBadge>}
            </motion.li>
          ))}
        </ol>
      </section>
    </div>
  );
}
