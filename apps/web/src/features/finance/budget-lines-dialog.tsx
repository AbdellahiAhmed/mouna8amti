"use client";

import { Check, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type SubmitEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { FormAlert } from "@/components/ui/form-alert";
import { Input } from "@/components/ui/input";
import { useApiErrorMessage } from "@/features/auth/use-api-error-message";
import { toMinor, toUnits, useMoney } from "@/lib/money";
import type { BudgetLine } from "@/lib/types";
import { useDeleteBudgetLine, useSaveBudgetLine } from "./queries";

/** Each line saves on its own: budgets change one line at a time, and a line with expenses cannot be deleted. */
export function BudgetLinesDialog({
  projectId,
  lines,
  open,
  onOpenChange,
}: {
  projectId: number;
  lines: BudgetLine[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("finance.budget");
  const money = useMoney();
  const total = lines.reduce((sum, l) => sum + l.amount, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t("editTitle")} description={t("editHint")}>
      <div className="flex flex-col gap-3">
        {lines.map((line) => (
          <LineRow key={line.id} projectId={projectId} line={line} />
        ))}
        <LineRow key={`new-${lines.length}`} projectId={projectId} />
        <p className="mt-2 text-body text-slate">
          {t("total")} <b className="font-display text-ink">{money.amount(total)}</b> {money.unit}
        </p>
      </div>
    </Dialog>
  );
}

function LineRow({ projectId, line }: { projectId: number; line?: BudgetLine }) {
  const t = useTranslations("finance.budget");
  const save = useSaveBudgetLine(projectId, line?.id);
  const remove = useDeleteBudgetLine();
  const errorMessage = useApiErrorMessage()(save.error ?? remove.error);
  const [name, setName] = useState(line?.name ?? "");
  const [amount, setAmount] = useState(line ? String(toUnits(line.amount)) : "");
  const dirty = !line || name !== line.name || amount !== String(toUnits(line.amount));

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    save.mutate({ name: name.trim(), amount: toMinor(Number(amount)) }, {
      onSuccess: () => {
        if (!line) {
          setName("");
          setAmount("");
        }
      },
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-1.5">
      <div className="grid grid-cols-[1fr_9rem_auto_auto] items-center gap-2">
        <Input aria-label={t("name")} placeholder={line ? undefined : t("newLine")} value={name} onChange={(e) => setName(e.target.value)} required maxLength={160} />
        <Input aria-label={t("amount")} type="number" min={0} step={1} dir="ltr" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        <Button type="submit" variant={line ? "secondary" : "primary"} size="icon" disabled={!dirty || save.isPending} aria-label={line ? t("save") : t("add")}>
          {line ? <Check aria-hidden /> : <Plus aria-hidden />}
        </Button>
        {line ? (
          <Button type="button" variant="ghost" size="icon" aria-label={t("remove")} disabled={remove.isPending} onClick={() => remove.mutate(line.id)}>
            <Trash2 aria-hidden />
          </Button>
        ) : (
          <span className="size-10" />
        )}
      </div>
      <FormAlert message={errorMessage} />
    </form>
  );
}
