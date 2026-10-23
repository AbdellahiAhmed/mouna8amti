"use client";

import { Paperclip, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type SubmitEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Input, Select } from "@/components/ui/input";
import { useApiErrorMessage } from "@/features/auth/use-api-error-message";
import { useProjects } from "@/features/projects/queries";
import { ApiError } from "@/lib/api";
import { toMinor, toUnits } from "@/lib/money";
import type { Expense } from "@/lib/types";
import { useBudgetLines, useSaveExpense } from "./queries";

type Share = { key: string; budget_line_id: string; percent: string };

const today = () => new Date().toISOString().slice(0, 10);

export function ExpenseFormDialog({ expense, open, onOpenChange }: { expense?: Expense; open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations("finance.expenseForm");
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={expense ? t("edit") : t("new")} description={t("hint")}>
      <ExpenseForm key={expense?.id ?? "new"} expense={expense} onDone={() => onOpenChange(false)} />
    </Dialog>
  );
}

function ExpenseForm({ expense, onDone }: { expense?: Expense; onDone: () => void }) {
  const t = useTranslations("finance.expenseForm");
  const save = useSaveExpense(expense?.id);
  const projects = useProjects({});
  const [projectId, setProjectId] = useState<number | null>(expense?.project?.id ?? null);
  const lines = useBudgetLines(projectId);
  const [shares, setShares] = useState<Share[]>(
    expense?.allocations?.map((a) => ({ key: String(a.budget_line_id), budget_line_id: String(a.budget_line_id), percent: String(a.percent) })) ?? [
      { key: "first", budget_line_id: "", percent: "100" },
    ],
  );
  const [file, setFile] = useState<File | null>(null);
  const formError = useApiErrorMessage()(save.error);
  const fieldError = (field: string) => (save.error instanceof ApiError ? save.error.firstFieldError(field) : undefined);
  const totalPercent = shares.reduce((sum, s) => sum + (Number(s.percent) || 0), 0);
  const update = (key: string, patch: Partial<Share>) => setShares((all) => all.map((s) => (s.key === key ? { ...s, ...patch } : s)));

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    save.mutate(
      {
        project_id: Number(projectId),
        description: String(form.get("description")).trim(),
        payee: String(form.get("payee") ?? "").trim() || null,
        amount: toMinor(Number(form.get("amount"))),
        spent_on: String(form.get("spent_on")),
        allocations: shares.map((s) => ({ budget_line_id: Number(s.budget_line_id), percent: Number(s.percent) })),
        attachment: file,
      },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <FormAlert message={formError} />

      <Field label={t("description")} error={fieldError("description")}>
        <Input name="description" defaultValue={expense?.description} required maxLength={500} autoFocus placeholder={t("descriptionHint")} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("amount")} error={fieldError("amount")}>
          <Input name="amount" type="number" min={1} step={1} inputMode="numeric" dir="ltr" defaultValue={expense ? toUnits(expense.amount) : ""} required />
        </Field>
        <Field label={t("spentOn")} error={fieldError("spent_on")}>
          <Input name="spent_on" type="date" max={today()} defaultValue={expense?.spent_on ?? today()} required />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("project")} error={fieldError("project_id")}>
          <Select
            key={projects.data ? "ready" : "loading"}
            value={projectId ?? ""}
            onChange={(e) => {
              setProjectId(Number(e.target.value) || null);
              setShares([{ key: crypto.randomUUID(), budget_line_id: "", percent: "100" }]);
            }}
            required
          >
            <option value="" disabled>
              {t("chooseProject")}
            </option>
            {projects.data?.data
              .filter((p) => p.status !== "closed" || p.id === projectId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </Select>
        </Field>
        <Field label={t("payee")} error={fieldError("payee")}>
          <Input name="payee" defaultValue={expense?.payee ?? ""} maxLength={160} />
        </Field>
      </div>

      <fieldset className="flex flex-col gap-2.5" disabled={!projectId}>
        <legend className="mb-1 text-label font-medium text-charcoal">{t("lines")}</legend>
        {projectId && lines.data?.data.length === 0 && <p className="text-caption text-slate">{t("noLines")}</p>}
        {shares.map((share) => (
          <div key={share.key} className="grid grid-cols-[1fr_6.5rem_auto] items-center gap-2">
            <Select aria-label={t("line")} value={share.budget_line_id} onChange={(e) => update(share.key, { budget_line_id: e.target.value })} required>
              <option value="" disabled>
                {t("chooseLine")}
              </option>
              {lines.data?.data.map((line) => (
                <option key={line.id} value={line.id}>
                  {line.name}
                </option>
              ))}
            </Select>
            <div className="relative">
              <Input aria-label={t("percent")} type="number" min={1} max={100} dir="ltr" value={share.percent} onChange={(e) => update(share.key, { percent: e.target.value })} className="pe-7" />
              <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-slate">%</span>
            </div>
            {shares.length > 1 ? (
              <Button type="button" variant="ghost" size="icon" aria-label={t("removeLine")} onClick={() => setShares((all) => all.filter((s) => s.key !== share.key))}>
                <Trash2 aria-hidden />
              </Button>
            ) : (
              <span className="size-10" />
            )}
          </div>
        ))}
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShares((all) => [...all, { key: crypto.randomUUID(), budget_line_id: "", percent: String(Math.max(0, 100 - totalPercent)) }])}
          >
            <Plus aria-hidden />
            {t("split")}
          </Button>
          <span className={totalPercent === 100 ? "text-caption text-slate" : "text-caption font-medium text-danger"}>
            {t("total", { percent: totalPercent })}
          </span>
        </div>
        {fieldError("allocations") && <p className="text-caption text-danger">{fieldError("allocations")}</p>}
      </fieldset>

      <Field label={t("invoice")} error={fieldError("attachment")}>
        <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-sm border border-dashed border-hairline-strong px-4 text-body text-charcoal hover:border-primary">
          <Paperclip aria-hidden className="size-4 text-slate" />
          <span className="flex-1 truncate">{file?.name ?? expense?.attachment?.name ?? t("invoiceHint")}</span>
          <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
      </Field>

      <div className="mt-2 flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onDone}>
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={save.isPending || !projectId}>
          {save.isPending ? t("saving") : expense ? t("save") : t("submit")}
        </Button>
      </div>
    </form>
  );
}
