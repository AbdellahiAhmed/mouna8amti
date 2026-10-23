"use client";

import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type SubmitEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { Input, Select } from "@/components/ui/input";
import { useApiErrorMessage } from "@/features/auth/use-api-error-message";
import { useDonors } from "@/features/donors/queries";
import { useProjects } from "@/features/projects/queries";
import { ApiError } from "@/lib/api";
import { toMinor, toUnits } from "@/lib/money";
import type { Grant } from "@/lib/types";
import { useSaveGrant } from "./queries";

type TrancheRow = { key: string; id?: number; amount: string; expected_on: string; received_on: string };

/** A donor's grant to one project, with its payment schedule. Opened from a project or a donor. */
export function GrantFormDialog({
  grant,
  defaults,
  open,
  onOpenChange,
}: {
  grant?: Grant;
  defaults?: { project_id?: number; donor_id?: number };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("finance.grants");
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={grant ? t("edit") : t("new")} description={t("hint")}>
      <GrantForm key={grant?.id ?? "new"} grant={grant} defaults={defaults} onDone={() => onOpenChange(false)} />
    </Dialog>
  );
}

function GrantForm({ grant, defaults, onDone }: { grant?: Grant; defaults?: { project_id?: number; donor_id?: number }; onDone: () => void }) {
  const t = useTranslations("finance.grants");
  const save = useSaveGrant(grant?.id);
  const donors = useDonors();
  const projects = useProjects({});
  const formError = useApiErrorMessage()(save.error);
  const fieldError = (field: string) => (save.error instanceof ApiError ? save.error.firstFieldError(field) : undefined);

  const [rows, setRows] = useState<TrancheRow[]>(
    (grant?.tranches ?? []).map((tr) => ({
      key: String(tr.id),
      id: tr.id,
      amount: String(toUnits(tr.amount)),
      expected_on: tr.expected_on,
      received_on: tr.received_on ?? "",
    })),
  );
  const update = (key: string, patch: Partial<TrancheRow>) => setRows((all) => all.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    save.mutate(
      {
        donor_id: Number(form.get("donor_id")),
        project_id: Number(form.get("project_id")),
        reference: String(form.get("reference") ?? "").trim() || null,
        amount: toMinor(Number(form.get("amount"))),
        signed_on: String(form.get("signed_on") ?? "") || null,
        tranches: rows.map((r) => ({
          ...(r.id ? { id: r.id } : {}),
          amount: toMinor(Number(r.amount)),
          expected_on: r.expected_on,
          received_on: r.received_on || null,
        })),
      },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <FormAlert message={formError} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={t("donor")} error={fieldError("donor_id")}>
          <Select key={donors.data ? "ready" : "loading"} name="donor_id" defaultValue={grant?.donor?.id ?? defaults?.donor_id ?? ""} required>
            <option value="" disabled />
            {donors.data?.data.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("project")} error={fieldError("project_id")}>
          <Select key={projects.data ? "ready" : "loading"} name="project_id" defaultValue={grant?.project?.id ?? defaults?.project_id ?? ""} required>
            <option value="" disabled />
            {projects.data?.data.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label={t("amount")} error={fieldError("amount")}>
          <Input name="amount" type="number" min={1} step={1} inputMode="numeric" dir="ltr" defaultValue={grant ? toUnits(grant.amount) : ""} required />
        </Field>
        <Field label={t("reference")} error={fieldError("reference")}>
          <Input name="reference" dir="ltr" maxLength={64} defaultValue={grant?.reference ?? ""} />
        </Field>
        <Field label={t("signedOn")} error={fieldError("signed_on")}>
          <Input name="signed_on" type="date" defaultValue={grant?.signed_on ?? ""} />
        </Field>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-label font-medium text-charcoal">{t("tranches")}</legend>
        {fieldError("tranches") && <p className="text-caption text-danger">{fieldError("tranches")}</p>}
        {rows.length === 0 && <p className="text-caption text-slate">{t("noTranches")}</p>}
        {rows.map((row, i) => (
          <div key={row.key} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
            <Field label={i === 0 ? t("trancheAmount") : ""} error={fieldError(`tranches.${i}.amount`)}>
              <Input type="number" min={1} step={1} dir="ltr" aria-label={t("trancheAmount")} value={row.amount} onChange={(e) => update(row.key, { amount: e.target.value })} required />
            </Field>
            <Field label={i === 0 ? t("expectedOn") : ""} error={fieldError(`tranches.${i}.expected_on`)}>
              <Input type="date" aria-label={t("expectedOn")} value={row.expected_on} onChange={(e) => update(row.key, { expected_on: e.target.value })} required />
            </Field>
            <Field label={i === 0 ? t("receivedOn") : ""} error={fieldError(`tranches.${i}.received_on`)}>
              <Input type="date" aria-label={t("receivedOn")} value={row.received_on} onChange={(e) => update(row.key, { received_on: e.target.value })} />
            </Field>
            <Button type="button" variant="ghost" size="icon" aria-label={t("removeTranche")} onClick={() => setRows((all) => all.filter((r) => r.key !== row.key))}>
              <Trash2 aria-hidden />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          className="self-start"
          onClick={() => setRows((all) => [...all, { key: crypto.randomUUID(), amount: "", expected_on: "", received_on: "" }])}
        >
          <Plus aria-hidden />
          {t("addTranche")}
        </Button>
      </fieldset>

      <div className="mt-2 flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onDone}>
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? t("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
}
