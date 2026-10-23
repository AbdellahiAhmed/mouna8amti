"use client";

import { FileText, Paperclip, Pencil, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useDeferredValue, useState, type SubmitEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Input, Select } from "@/components/ui/input";
import { useApiErrorMessage } from "@/features/auth/use-api-error-message";
import { Pill, useDates } from "@/features/finance/ui";
import { Chips, PageFrame } from "@/features/operations/page-frame";
import { useRecords, useSaveRecord } from "@/features/operations/queries";
import { useOrganization } from "@/features/organization/organization-context";
import { useProjects } from "@/features/projects/queries";
import { ApiError } from "@/lib/api";
import type { ArchiveDocument, DocumentCategory, DocumentDirection } from "@/lib/types";

const CATEGORIES: DocumentCategory[] = ["contract", "report", "letter", "invoice", "other"];
const DIRECTIONS: DocumentDirection[] = ["incoming", "outgoing", "internal"];

export default function ArchivePage() {
  const t = useTranslations("ops.archive");
  const tcat = useTranslations("ops.documentCategory");
  const tdir = useTranslations("ops.direction");
  const dates = useDates();
  const { can, organization } = useOrganization();
  const [category, setCategory] = useState<DocumentCategory | undefined>();
  const [search, setSearch] = useState("");
  const deferred = useDeferredValue(search.trim());
  const [editing, setEditing] = useState<ArchiveDocument | "new" | null>(null);
  const records = useRecords<ArchiveDocument>("documents", { category, search: deferred || undefined });
  const list = records.data?.data ?? [];

  return (
    <PageFrame
      title={t("title")}
      subtitle={t("subtitle")}
      newLabel={can("documents.manage") ? t("new") : undefined}
      onNew={() => setEditing("new")}
      query={records}
      isEmpty={list.length === 0}
      emptyTitle={t("empty")}
      filters={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Chips value={category} label={t("filter")} onChange={setCategory} options={[{ label: t("all") }, ...CATEGORIES.map((c) => ({ value: c, label: tcat(c) }))]} />
          <label className="relative w-full sm:w-72">
            <span className="sr-only">{t("search")}</span>
            <Search aria-hidden className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-steel" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("search")} className="ps-9" />
          </label>
        </div>
      }
    >
      <div className="overflow-hidden rounded-[18px] border border-hairline bg-canvas">
        {list.map((d) => (
          <div key={d.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-hairline-soft px-5 py-4 first:border-t-0 sm:px-6">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-mist text-primary dark:bg-primary-soft"><FileText aria-hidden className="size-5" /></span>
            <div className="flex min-w-0 flex-[1_1_16rem] flex-col leading-snug">
              <span className="font-semibold text-ink">{d.title}</span>
              <span className="text-caption text-slate">
                {[dates.full(d.dated_on), d.reference, d.project?.name].filter(Boolean).join(" · ")}
              </span>
            </div>
            <Pill tone="wait">{tcat(d.category)}</Pill>
            <Pill tone={d.direction === "incoming" ? "on" : "stop"}>{tdir(d.direction)}</Pill>
            {d.file && (
              <a href={`/api/orgs/${organization.slug}/documents/${d.id}/file`} className="inline-flex items-center gap-1.5 text-caption font-medium text-primary hover:text-night">
                <Paperclip aria-hidden className="size-4" />
                {t("open")}
              </a>
            )}
            {can("documents.manage") && <Button variant="ghost" size="icon" aria-label={t("edit")} onClick={() => setEditing(d)}><Pencil aria-hidden /></Button>}
          </div>
        ))}
      </div>
      {can("documents.manage") && (
        <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} title={editing === "new" ? t("new") : t("edit")}>
          <DocumentForm key={editing === "new" ? "new" : editing?.id} document={editing === "new" ? undefined : (editing ?? undefined)} onDone={() => setEditing(null)} />
        </Dialog>
      )}
    </PageFrame>
  );
}

function DocumentForm({ document, onDone }: { document?: ArchiveDocument; onDone: () => void }) {
  const t = useTranslations("ops.archive");
  const tcat = useTranslations("ops.documentCategory");
  const tdir = useTranslations("ops.direction");
  const projects = useProjects({});
  const save = useSaveRecord<ArchiveDocument>("documents");
  const [file, setFile] = useState<File | null>(null);
  const formError = useApiErrorMessage()(save.error);
  const fieldError = (f: string) => (save.error instanceof ApiError ? save.error.firstFieldError(f) : undefined);

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = new FormData(event.currentTarget);
    if (!body.get("project_id")) body.delete("project_id");
    if (!body.get("reference")) body.delete("reference");
    body.delete("file");
    if (file) body.set("file", file);
    save.mutate({ id: document?.id, body }, { onSuccess: onDone });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <FormAlert message={formError} />
      <Field label={t("titleLabel")} error={fieldError("title")}><Input name="title" defaultValue={document?.title} required autoFocus /></Field>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label={t("category")} error={fieldError("category")}>
          <Select name="category" defaultValue={document?.category ?? "letter"}>{CATEGORIES.map((c) => <option key={c} value={c}>{tcat(c)}</option>)}</Select>
        </Field>
        <Field label={t("directionLabel")} error={fieldError("direction")}>
          <Select name="direction" defaultValue={document?.direction ?? "incoming"}>{DIRECTIONS.map((d) => <option key={d} value={d}>{tdir(d)}</option>)}</Select>
        </Field>
        <Field label={t("date")} error={fieldError("dated_on")}><Input name="dated_on" type="date" defaultValue={document?.dated_on ?? new Date().toISOString().slice(0, 10)} required /></Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("reference")} error={fieldError("reference")}><Input name="reference" dir="ltr" defaultValue={document?.reference ?? ""} maxLength={64} /></Field>
        <Field label={t("project")} error={fieldError("project_id")}>
          <Select key={projects.data ? "ready" : "loading"} name="project_id" defaultValue={document?.project?.id ?? ""}>
            <option value="">{t("noProject")}</option>
            {projects.data?.data.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
      </div>
      <Field label={t("file")} error={fieldError("file")}>
        <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-sm border border-dashed border-hairline-strong px-4 text-body text-charcoal hover:border-primary">
          <Paperclip aria-hidden className="size-4 text-slate" />
          <span className="flex-1 truncate">{file?.name ?? document?.file?.name ?? t("fileHint")}</span>
          <input type="file" name="file" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
      </Field>
      <div className="mt-2 flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onDone}>{t("cancel")}</Button>
        <Button type="submit" disabled={save.isPending}>{t("save")}</Button>
      </div>
    </form>
  );
}
