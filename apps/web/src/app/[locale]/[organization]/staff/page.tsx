"use client";

import { Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type SubmitEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Input, Select } from "@/components/ui/input";
import { useApiErrorMessage } from "@/features/auth/use-api-error-message";
import { Card, Pill, useDates } from "@/features/finance/ui";
import { PageFrame } from "@/features/operations/page-frame";
import { useRecords, useSaveRecord } from "@/features/operations/queries";
import { useOrganization } from "@/features/organization/organization-context";
import { useProjects } from "@/features/projects/queries";
import { ApiError } from "@/lib/api";
import { toMinor, toUnits, useMoney } from "@/lib/money";
import type { ContractType, Employee } from "@/lib/types";

const CONTRACTS: ContractType[] = ["permanent", "fixed_term", "consultant", "volunteer"];

export default function StaffPage() {
  const t = useTranslations("ops.staff");
  const tc = useTranslations("ops.contract");
  const { can } = useOrganization();
  const money = useMoney();
  const dates = useDates();
  const records = useRecords<Employee>("employees");
  const [editing, setEditing] = useState<Employee | "new" | null>(null);
  const list = records.data?.data ?? [];
  const isHr = can("hr.manage");
  const payroll = list.reduce((sum, e) => sum + (e.monthly_salary ?? 0), 0);

  return (
    <PageFrame
      title={t("title")}
      subtitle={t("subtitle", { count: list.length })}
      newLabel={isHr ? t("new") : undefined}
      onNew={() => setEditing("new")}
      query={records}
      isEmpty={list.length === 0}
      emptyTitle={t("empty")}
      filters={isHr && list.length > 0 ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-night bg-night text-white">
          <span className="text-white/80">{t("payroll")}</span>
          <span className="font-display text-[1.75rem] font-semibold tabular-nums">{money.amount(payroll)} <span className="font-sans text-body font-normal text-white/80">{money.unit}</span></span>
        </Card>
      ) : undefined}
    >
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(20rem,100%),1fr))] gap-4">
        {list.map((e) => (
          <section key={e.id} className="flex flex-col gap-3 rounded-[18px] border border-hairline bg-canvas p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="leading-snug">
                <h2 className="font-semibold text-ink">{e.full_name}</h2>
                <span className="text-caption text-slate">{[e.position, e.project?.name].filter(Boolean).join(" · ")}</span>
              </div>
              {isHr && <Button variant="ghost" size="icon" aria-label={t("edit")} onClick={() => setEditing(e)}><Pencil aria-hidden /></Button>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={e.contract_type === "volunteer" ? "wait" : "on"}>{tc(e.contract_type)}</Pill>
              <span className="text-caption text-slate">
                {e.ends_on ? t("period", { from: dates.full(e.starts_on), to: dates.full(e.ends_on) }) : t("since", { from: dates.full(e.starts_on) })}
              </span>
            </div>
            {isHr && e.monthly_salary != null && (
              <span className="text-body text-charcoal">{t("salary", { amount: money.amount(e.monthly_salary), unit: money.unit })}</span>
            )}
            {(e.phone || e.email) && <span className="mt-auto text-caption text-steel" dir="ltr">{[e.phone, e.email].filter(Boolean).join(" · ")}</span>}
          </section>
        ))}
      </div>
      {isHr && (
        <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} title={editing === "new" ? t("new") : t("edit")}>
          <EmployeeForm key={editing === "new" ? "new" : editing?.id} employee={editing === "new" ? undefined : (editing ?? undefined)} onDone={() => setEditing(null)} />
        </Dialog>
      )}
    </PageFrame>
  );
}

function EmployeeForm({ employee, onDone }: { employee?: Employee; onDone: () => void }) {
  const t = useTranslations("ops.staff");
  const tc = useTranslations("ops.contract");
  const projects = useProjects({});
  const save = useSaveRecord<Employee>("employees");
  const formError = useApiErrorMessage()(save.error);
  const fieldError = (f: string) => (save.error instanceof ApiError ? save.error.firstFieldError(f) : undefined);

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const text = (k: string) => String(f.get(k) ?? "").trim() || null;
    const salary = text("monthly_salary");
    save.mutate(
      {
        id: employee?.id,
        body: {
          full_name: text("full_name"), position: text("position"), project_id: Number(f.get("project_id")) || null,
          contract_type: f.get("contract_type"), starts_on: text("starts_on"), ends_on: text("ends_on"),
          monthly_salary: salary === null ? null : toMinor(Number(salary)), phone: text("phone"), email: text("email"),
        },
      },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <FormAlert message={formError} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("name")} error={fieldError("full_name")}><Input name="full_name" defaultValue={employee?.full_name} required autoFocus /></Field>
        <Field label={t("position")} error={fieldError("position")}><Input name="position" defaultValue={employee?.position} required /></Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("contract")} error={fieldError("contract_type")}>
          <Select name="contract_type" defaultValue={employee?.contract_type ?? "fixed_term"}>{CONTRACTS.map((c) => <option key={c} value={c}>{tc(c)}</option>)}</Select>
        </Field>
        <Field label={t("project")} error={fieldError("project_id")}>
          <Select key={projects.data ? "ready" : "loading"} name="project_id" defaultValue={employee?.project?.id ?? ""}>
            <option value="">{t("noProject")}</option>
            {projects.data?.data.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label={t("startsOn")} error={fieldError("starts_on")}><Input name="starts_on" type="date" defaultValue={employee?.starts_on} required /></Field>
        <Field label={t("endsOn")} error={fieldError("ends_on")}><Input name="ends_on" type="date" defaultValue={employee?.ends_on ?? ""} /></Field>
        <Field label={t("salaryLabel")} error={fieldError("monthly_salary")}><Input name="monthly_salary" type="number" min={0} dir="ltr" defaultValue={employee?.monthly_salary != null ? toUnits(employee.monthly_salary) : ""} /></Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("phone")} error={fieldError("phone")}><Input name="phone" dir="ltr" defaultValue={employee?.phone ?? ""} /></Field>
        <Field label={t("email")} error={fieldError("email")}><Input name="email" type="email" dir="ltr" defaultValue={employee?.email ?? ""} /></Field>
      </div>
      <div className="mt-2 flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onDone}>{t("cancel")}</Button>
        <Button type="submit" disabled={save.isPending}>{t("save")}</Button>
      </div>
    </form>
  );
}
