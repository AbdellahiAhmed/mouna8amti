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
import { Pill } from "@/features/finance/ui";
import { Chips, PageFrame } from "@/features/operations/page-frame";
import { useRecords, useSaveRecord } from "@/features/operations/queries";
import { useOrganization } from "@/features/organization/organization-context";
import { useProjects } from "@/features/projects/queries";
import { ApiError } from "@/lib/api";
import { toMinor, toUnits, useMoney } from "@/lib/money";
import type { Asset, AssetCategory, AssetCondition } from "@/lib/types";

const CATEGORIES: AssetCategory[] = ["vehicle", "it", "furniture", "equipment", "other"];
const CONDITIONS: AssetCondition[] = ["good", "fair", "broken", "disposed"];
const TONE: Record<AssetCondition, "on" | "wait" | "stop"> = { good: "on", fair: "wait", broken: "stop", disposed: "stop" };

export default function AssetsPage() {
  const t = useTranslations("ops.assets");
  const tcat = useTranslations("ops.assetCategory");
  const tcond = useTranslations("ops.assetCondition");
  const { can } = useOrganization();
  const money = useMoney();
  const [category, setCategory] = useState<AssetCategory | undefined>();
  const [editing, setEditing] = useState<Asset | "new" | null>(null);
  const records = useRecords<Asset>("assets", { category });
  const list = records.data?.data ?? [];
  const total = list.reduce((sum, a) => sum + (a.value ?? 0), 0);

  return (
    <PageFrame
      title={t("title")}
      subtitle={t("subtitle", { count: list.length, value: money.amount(total), unit: money.unit })}
      newLabel={can("assets.manage") ? t("new") : undefined}
      onNew={() => setEditing("new")}
      query={records}
      isEmpty={list.length === 0}
      emptyTitle={t("empty")}
      filters={<Chips value={category} label={t("filter")} onChange={setCategory} options={[{ label: t("all") }, ...CATEGORIES.map((c) => ({ value: c, label: tcat(c) }))]} />}
    >
      <div className="overflow-hidden rounded-[18px] border border-hairline bg-canvas">
        {list.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-hairline-soft px-5 py-4 first:border-t-0 sm:px-6">
            <div className="flex min-w-0 flex-[1_1_16rem] flex-col leading-snug">
              <span className="flex items-center gap-2">
                <span className="font-semibold text-ink">{a.name}</span>
                {a.tag && <span className="font-mono text-caption text-steel" dir="ltr">{a.tag}</span>}
              </span>
              <span className="text-caption text-slate">{[tcat(a.category), a.project?.name, a.location, a.holder && t("heldBy", { name: a.holder })].filter(Boolean).join(" · ")}</span>
            </div>
            {a.value != null && <span className="font-display font-semibold tabular-nums text-ink">{money.amount(a.value)}</span>}
            <Pill tone={TONE[a.condition]}>{tcond(a.condition)}</Pill>
            {can("assets.manage") && <Button variant="ghost" size="icon" aria-label={t("edit")} onClick={() => setEditing(a)}><Pencil aria-hidden /></Button>}
          </div>
        ))}
      </div>
      {can("assets.manage") && (
        <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} title={editing === "new" ? t("new") : t("edit")}>
          <AssetForm key={editing === "new" ? "new" : editing?.id} asset={editing === "new" ? undefined : (editing ?? undefined)} onDone={() => setEditing(null)} />
        </Dialog>
      )}
    </PageFrame>
  );
}

function AssetForm({ asset, onDone }: { asset?: Asset; onDone: () => void }) {
  const t = useTranslations("ops.assets");
  const tcat = useTranslations("ops.assetCategory");
  const tcond = useTranslations("ops.assetCondition");
  const projects = useProjects({});
  const save = useSaveRecord<Asset>("assets");
  const formError = useApiErrorMessage()(save.error);
  const fieldError = (f: string) => (save.error instanceof ApiError ? save.error.firstFieldError(f) : undefined);

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const text = (k: string) => String(f.get(k) ?? "").trim() || null;
    const value = text("value");
    save.mutate(
      {
        id: asset?.id,
        body: {
          name: text("name"), category: f.get("category"), tag: text("tag"), project_id: Number(f.get("project_id")) || null,
          location: text("location"), holder: text("holder"), acquired_on: text("acquired_on"),
          value: value === null ? null : toMinor(Number(value)), condition: f.get("condition"),
        },
      },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <FormAlert message={formError} />
      <div className="grid gap-5 sm:grid-cols-[1fr_9rem]">
        <Field label={t("name")} error={fieldError("name")}><Input name="name" defaultValue={asset?.name} required autoFocus /></Field>
        <Field label={t("tag")} error={fieldError("tag")}><Input name="tag" dir="ltr" defaultValue={asset?.tag ?? ""} maxLength={40} /></Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("category")} error={fieldError("category")}>
          <Select name="category" defaultValue={asset?.category ?? "equipment"}>{CATEGORIES.map((c) => <option key={c} value={c}>{tcat(c)}</option>)}</Select>
        </Field>
        <Field label={t("condition")} error={fieldError("condition")}>
          <Select name="condition" defaultValue={asset?.condition ?? "good"}>{CONDITIONS.map((c) => <option key={c} value={c}>{tcond(c)}</option>)}</Select>
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("project")} error={fieldError("project_id")}>
          <Select key={projects.data ? "ready" : "loading"} name="project_id" defaultValue={asset?.project?.id ?? ""}>
            <option value="">{t("noProject")}</option>
            {projects.data?.data.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
        <Field label={t("location")} error={fieldError("location")}><Input name="location" defaultValue={asset?.location ?? ""} /></Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label={t("holder")} error={fieldError("holder")}><Input name="holder" defaultValue={asset?.holder ?? ""} /></Field>
        <Field label={t("acquiredOn")} error={fieldError("acquired_on")}><Input name="acquired_on" type="date" defaultValue={asset?.acquired_on ?? ""} /></Field>
        <Field label={t("value")} error={fieldError("value")}><Input name="value" type="number" min={0} dir="ltr" defaultValue={asset?.value != null ? toUnits(asset.value) : ""} /></Field>
      </div>
      <div className="mt-2 flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onDone}>{t("cancel")}</Button>
        <Button type="submit" disabled={save.isPending}>{t("save")}</Button>
      </div>
    </form>
  );
}
