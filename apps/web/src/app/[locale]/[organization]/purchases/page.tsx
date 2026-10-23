"use client";

import { useTranslations } from "next-intl";
import { useState, type SubmitEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Input, Select } from "@/components/ui/input";
import { useApiErrorMessage } from "@/features/auth/use-api-error-message";
import { Pill, useDates } from "@/features/finance/ui";
import { Chips, PageFrame } from "@/features/operations/page-frame";
import { usePurchaseStatus, useRecords, useSaveRecord } from "@/features/operations/queries";
import { useOrganization } from "@/features/organization/organization-context";
import { useProjects } from "@/features/projects/queries";
import { ApiError } from "@/lib/api";
import { toMinor, toUnits, useMoney } from "@/lib/money";
import type { PurchaseRequest, PurchaseStatus } from "@/lib/types";

const TONE: Record<PurchaseStatus, "wait" | "on" | "done" | "stop"> = { requested: "wait", approved: "on", ordered: "on", received: "done", cancelled: "stop" };
const STATUSES: PurchaseStatus[] = ["requested", "approved", "ordered", "received", "cancelled"];

export default function PurchasesPage() {
  const t = useTranslations("ops.purchases");
  const ts = useTranslations("ops.purchaseStatus");
  const { can, membership } = useOrganization();
  const money = useMoney();
  const dates = useDates();
  const [status, setStatus] = useState<PurchaseStatus | undefined>();
  const [editing, setEditing] = useState<PurchaseRequest | "new" | null>(null);
  const records = useRecords<PurchaseRequest>("purchase-requests", { status });
  const move = usePurchaseStatus();
  const moveError = useApiErrorMessage()(move.error);
  const list = records.data?.data ?? [];

  /** Which next steps this viewer may take: approval by someone other than the requester. */
  const allowed = (r: PurchaseRequest) =>
    r.next.filter((s) => (s === "approved" ? can("expenses.approve") && r.requested?.membership_id !== membership.id : can("procurement.manage")));

  return (
    <PageFrame
      title={t("title")}
      subtitle={t("subtitle")}
      newLabel={can("procurement.manage") ? t("new") : undefined}
      onNew={() => setEditing("new")}
      query={records}
      isEmpty={list.length === 0}
      emptyTitle={t("empty")}
      filters={<Chips value={status} label={t("filter")} onChange={setStatus} options={[{ label: t("all") }, ...STATUSES.map((s) => ({ value: s, label: ts(s) }))]} />}
    >
      <FormAlert message={moveError} />
      <div className="flex flex-col gap-3">
        {list.map((r) => (
          <section key={r.id} className="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-[18px] border border-hairline bg-canvas px-5 py-4 sm:px-6">
            <div className="flex min-w-0 flex-[1_1_18rem] flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-caption text-steel" dir="ltr">{r.number}</span>
                <span className="font-semibold text-ink">{r.title}</span>
                <Pill tone={TONE[r.status]}>{ts(r.status)}</Pill>
              </div>
              <span className="text-caption text-slate">
                {[r.project?.name, r.supplier, r.requested?.name && t("by", { name: r.requested.name }), r.approved?.name && t("approvedBy", { name: r.approved.name })].filter(Boolean).join(" · ")}
              </span>
            </div>
            <div className="flex flex-col leading-snug">
              <span className="font-display text-[1.125rem] font-semibold tabular-nums text-ink">{money.amount(r.estimated_amount)} <span className="font-sans text-caption font-normal text-slate">{money.unit}</span></span>
              {r.needed_by && <span className="text-caption text-slate">{t("neededBy", { date: dates.full(r.needed_by) })}</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              {r.status === "requested" && can("procurement.manage") && (
                <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>{t("edit")}</Button>
              )}
              {allowed(r).map((next) => (
                <Button key={next} size="sm" variant={next === "cancelled" ? "ghost" : "secondary"} disabled={move.isPending} onClick={() => move.mutate({ id: r.id, status: next })}>
                  {t(`to.${next as Exclude<PurchaseStatus, "requested">}`)}
                </Button>
              ))}
            </div>
          </section>
        ))}
      </div>
      {can("procurement.manage") && (
        <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} title={editing === "new" ? t("new") : t("edit")} description={t("hint")}>
          <PurchaseForm key={editing === "new" ? "new" : editing?.id} request={editing === "new" ? undefined : (editing ?? undefined)} onDone={() => setEditing(null)} />
        </Dialog>
      )}
    </PageFrame>
  );
}

function PurchaseForm({ request, onDone }: { request?: PurchaseRequest; onDone: () => void }) {
  const t = useTranslations("ops.purchases");
  const projects = useProjects({});
  const save = useSaveRecord<PurchaseRequest>("purchase-requests");
  const formError = useApiErrorMessage()(save.error);
  const fieldError = (f: string) => (save.error instanceof ApiError ? save.error.firstFieldError(f) : undefined);

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    save.mutate(
      {
        id: request?.id,
        body: {
          project_id: Number(f.get("project_id")),
          title: String(f.get("title")).trim(),
          supplier: String(f.get("supplier") ?? "").trim() || null,
          estimated_amount: toMinor(Number(f.get("estimated_amount"))),
          needed_by: String(f.get("needed_by") ?? "") || null,
          details: String(f.get("details") ?? "").trim() || null,
        },
      },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <FormAlert message={formError} />
      <Field label={t("what")} error={fieldError("title")}>
        <Input name="title" defaultValue={request?.title} required maxLength={200} autoFocus />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("project")} error={fieldError("project_id")}>
          <Select key={projects.data ? "ready" : "loading"} name="project_id" defaultValue={request?.project?.id ?? ""} required>
            <option value="" disabled />
            {projects.data?.data.filter((p) => p.status !== "closed").map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
        <Field label={t("supplier")} error={fieldError("supplier")}>
          <Input name="supplier" defaultValue={request?.supplier ?? ""} maxLength={160} />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("amount")} error={fieldError("estimated_amount")}>
          <Input name="estimated_amount" type="number" min={1} dir="ltr" defaultValue={request ? toUnits(request.estimated_amount) : ""} required />
        </Field>
        <Field label={t("neededByLabel")} error={fieldError("needed_by")}>
          <Input name="needed_by" type="date" defaultValue={request?.needed_by ?? ""} />
        </Field>
      </div>
      <Field label={t("details")} error={fieldError("details")}>
        <textarea name="details" rows={3} defaultValue={request?.details ?? ""} className="w-full rounded-sm border border-hairline-strong bg-canvas px-3.5 py-2.5 text-body text-ink focus:border-primary focus:outline-none" />
      </Field>
      <div className="mt-2 flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onDone}>{t("cancel")}</Button>
        <Button type="submit" disabled={save.isPending}>{t("save")}</Button>
      </div>
    </form>
  );
}
