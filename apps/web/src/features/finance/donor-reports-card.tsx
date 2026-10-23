"use client";

import { Check, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type SubmitEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Input, Select } from "@/components/ui/input";
import { useApiErrorMessage } from "@/features/auth/use-api-error-message";
import { useOrganization } from "@/features/organization/organization-context";
import { ApiError } from "@/lib/api";
import type { Donor } from "@/lib/types";
import { useDonorReports, useSaveDonorReport } from "./queries";
import { Card, CardHead, Pill, useDates } from "./ui";

const today = () => new Date().toISOString().slice(0, 10);

/** Reports each grant agreement requires, oldest deadline first. */
export function DonorReportsCard({ donors }: { donors: Donor[] }) {
  const t = useTranslations("finance.donorReports");
  const dates = useDates();
  const { can } = useOrganization();
  const reports = useDonorReports();
  const save = useSaveDonorReport();
  const [adding, setAdding] = useState(false);
  const canManage = can("grants.manage");
  const list = reports.data?.data ?? [];
  if (!reports.data || (list.length === 0 && !canManage)) return null;

  return (
    <Card>
      <CardHead title={t("title")}>
        {canManage && (
          <Button variant="ghost" size="sm" onClick={() => setAdding(true)}>
            <Plus aria-hidden />
            {t("add")}
          </Button>
        )}
      </CardHead>
      {list.length === 0 && <p className="py-4 text-body text-slate">{t("empty")}</p>}
      <ul>
        {list.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-3 border-t border-hairline-soft py-3.5 first:border-t-0">
            <span className="flex min-w-0 flex-1 flex-col leading-snug">
              <span className="font-medium text-ink">{r.title}</span>
              <span className="text-caption text-slate">{[r.donor?.name, r.project?.name].filter(Boolean).join(" · ")}</span>
            </span>
            <span className="text-caption text-slate">
              {r.submitted_on ? t("sentOn", { date: dates.full(r.submitted_on) }) : t("dueOn", { date: dates.full(r.due_on) })}
            </span>
            {r.submitted_on ? (
              <Pill tone="on">{t("sent")}</Pill>
            ) : canManage ? (
              <Button size="sm" variant="secondary" disabled={save.isPending} onClick={() => save.mutate({ id: r.id, title: r.title, due_on: r.due_on, submitted_on: today() })}>
                <Check aria-hidden />
                {t("markSent")}
              </Button>
            ) : (
              <Pill tone="wait">{t("pending")}</Pill>
            )}
          </li>
        ))}
      </ul>
      {canManage && (
        <Dialog open={adding} onOpenChange={setAdding} title={t("addTitle")}>
          <ReportForm donors={donors} onDone={() => setAdding(false)} />
        </Dialog>
      )}
    </Card>
  );
}

function ReportForm({ donors, onDone }: { donors: Donor[]; onDone: () => void }) {
  const t = useTranslations("finance.donorReports");
  const save = useSaveDonorReport();
  const formError = useApiErrorMessage()(save.error);
  const fieldError = (field: string) => (save.error instanceof ApiError ? save.error.firstFieldError(field) : undefined);
  const grants = donors.flatMap((d) => (d.grants ?? []).map((g) => ({ id: g.id, label: `${d.name} — ${g.project?.name ?? ""}` })));

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    save.mutate(
      { grantId: Number(form.get("grant")), title: String(form.get("title")).trim(), due_on: String(form.get("due_on")), submitted_on: null },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <FormAlert message={formError} />
      <Field label={t("grant")}>
        <Select name="grant" defaultValue={grants[0]?.id} required>
          {grants.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
        </Select>
      </Field>
      <Field label={t("reportTitle")} error={fieldError("title")}>
        <Input name="title" required maxLength={200} placeholder={t("titleHint")} />
      </Field>
      <Field label={t("deadline")} error={fieldError("due_on")}>
        <Input name="due_on" type="date" required />
      </Field>
      <div className="mt-2 flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onDone}>{t("cancel")}</Button>
        <Button type="submit" disabled={save.isPending || grants.length === 0}>{t("save")}</Button>
      </div>
    </form>
  );
}
