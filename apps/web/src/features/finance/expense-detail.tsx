"use client";

import { Check, Clock, FileText, Pencil, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import { Skeleton } from "@/components/ui/states";
import { useApiErrorMessage } from "@/features/auth/use-api-error-message";
import { cn } from "@/lib/cn";
import { useMoney } from "@/lib/money";
import type { Expense, ExpenseStep } from "@/lib/types";
import { ExpenseFormDialog } from "./expense-form-dialog";
import { useAttachmentUrl, useDeleteExpense, useExpense, useExpenseDecision } from "./queries";
import { ExpensePill, useDates } from "./ui";

export function ExpenseDetail({ id, onClosed }: { id: number; onClosed: () => void }) {
  const expense = useExpense(id);

  if (expense.isPending) return <Skeleton className="h-[32rem] rounded-[18px]" />;
  if (expense.error) return <FormAlert message={expense.error.message} />;
  return <ExpenseCard expense={expense.data.data} onClosed={onClosed} />;
}

function ExpenseCard({ expense, onClosed }: { expense: Expense; onClosed: () => void }) {
  const t = useTranslations("finance.expense");
  const money = useMoney();
  const dates = useDates();
  const attachment = useAttachmentUrl(expense.id);
  const lines = (expense.allocations ?? []).map((a) => (expense.allocations!.length > 1 ? `${a.name} (${a.percent}%)` : a.name)).join("، ");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-caption text-steel" dir="ltr">
            {expense.number}
          </span>
          <ExpensePill expense={expense} />
        </div>
        <h2 className="font-display text-[1.375rem] font-semibold leading-snug text-ink">{expense.description}</h2>
        <span className="font-display text-[2rem] font-semibold tabular-nums text-night dark:text-ink">
          {money.amount(expense.amount)}
          <span className="ms-1.5 font-sans text-body font-normal text-slate">{money.unit}</span>
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-[14px] bg-mist p-4 dark:bg-surface">
        <Info label={t("project")} value={expense.project?.name} />
        <Info label={t("date")} value={dates.full(expense.spent_on)} />
        <Info label={t("line")} value={lines} />
        <Info label={t("payee")} value={expense.payee ?? "—"} />
      </dl>

      <section>
        <h3 className="mb-3 font-display text-[1.0625rem] font-semibold text-ink">{t("path")}</h3>
        <ol className="flex flex-col">
          <Step done role={t("submittedBy")} step={expense.submitted} />
          {expense.rejected ? (
            <Step rejected role={t("rejectedBy")} step={expense.rejected} note={expense.rejection_reason} />
          ) : (
            <>
              <Step done={Boolean(expense.reviewed)} role={expense.reviewed ? t("reviewedBy") : t("awaitingReview")} step={expense.reviewed} />
              <Step done={Boolean(expense.approved)} role={expense.approved ? t("approvedBy") : t("awaitingApproval")} step={expense.approved} last />
            </>
          )}
        </ol>
      </section>

      {expense.attachment ? (
        <a
          href={attachment}
          target="_blank"
          rel="noopener"
          className="flex items-center gap-3 rounded-[14px] border border-hairline p-4 transition-colors hover:border-[#9cc9b6]"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-mist text-primary dark:bg-primary-soft">
            <FileText aria-hidden className="size-5" />
          </span>
          <span className="flex min-w-0 flex-col leading-snug">
            <span className="font-medium text-ink">{t("invoice")}</span>
            <span className="truncate text-caption text-slate" dir="ltr">
              {expense.attachment.name}
            </span>
          </span>
        </a>
      ) : (
        <p className="rounded-[14px] border border-dashed border-hairline-strong p-4 text-body text-slate">{t("noInvoice")}</p>
      )}

      <Actions expense={expense} onClosed={onClosed} />
    </div>
  );
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-caption text-slate">{label}</dt>
      <dd className="truncate font-medium text-ink">{value}</dd>
    </div>
  );
}

function Step({ role, step, done, rejected, last, note }: { role: string; step: ExpenseStep | null; done?: boolean; rejected?: boolean; last?: boolean; note?: string | null }) {
  const dates = useDates();
  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      {!last && !rejected && <span aria-hidden className="absolute start-[0.9375rem] top-8 h-[calc(100%-2rem)] w-px bg-hairline" />}
      <span
        className={cn(
          "relative grid size-8 shrink-0 place-items-center rounded-full [&_svg]:size-4",
          rejected ? "bg-[#efede8] text-[#55524b]" : done ? "bg-primary text-on-primary" : "bg-canvas text-primary shadow-[inset_0_0_0_1px_#9cc9b6]",
        )}
      >
        {rejected ? <X aria-hidden /> : done ? <Check aria-hidden /> : <Clock aria-hidden />}
      </span>
      <span className="flex flex-col leading-snug">
        <span className="text-caption text-slate">{role}</span>
        {step && (
          <span className="font-medium text-ink">
            {step.name}
            {step.at && <span className="ms-2 text-caption font-normal text-slate">{dates.dayMonth(step.at)}</span>}
          </span>
        )}
        {note && <span className="mt-1 rounded-sm bg-surface-sunken px-3 py-2 text-body text-charcoal">{note}</span>}
      </span>
    </li>
  );
}

function Actions({ expense, onClosed }: { expense: Expense; onClosed: () => void }) {
  const t = useTranslations("finance.expense");
  const decide = useExpenseDecision(expense.id);
  const remove = useDeleteExpense();
  const errorMessage = useApiErrorMessage()(decide.error ?? remove.error);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [editing, setEditing] = useState(false);
  const can = (action: Expense["actions"][number]) => expense.actions.includes(action);

  if (expense.actions.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <FormAlert message={errorMessage} />
      {rejecting ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            decide.mutate({ decision: "reject", reason: reason.trim() }, { onSuccess: () => setRejecting(false) });
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-label font-medium text-charcoal">{t("reason")}</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
              maxLength={1000}
              autoFocus
              className="w-full rounded-sm border border-hairline-strong bg-canvas px-3.5 py-2.5 text-body text-ink focus:border-primary focus:shadow-[0_0_0_3px_var(--primary-soft)] focus:outline-none"
            />
          </label>
          <div className="flex gap-3">
            <Button type="submit" variant="secondary" className="flex-1" disabled={decide.isPending || !reason.trim()}>
              {t("confirmReject")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setRejecting(false)}>
              {t("cancel")}
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex gap-3">
          {(can("review") || can("approve")) && (
            <Button size="lg" className="flex-1" disabled={decide.isPending} onClick={() => decide.mutate({ decision: can("review") ? "review" : "approve" })}>
              <Check aria-hidden />
              {can("review") ? t("review") : t("approve")}
            </Button>
          )}
          {can("reject") && (
            <Button size="lg" variant="secondary" onClick={() => setRejecting(true)}>
              {t("reject")}
            </Button>
          )}
          {can("edit") && (
            <Button size="lg" variant="secondary" className="flex-1" onClick={() => setEditing(true)}>
              <Pencil aria-hidden />
              {t("edit")}
            </Button>
          )}
          {can("delete") && (
            <Button size="lg" variant="ghost" aria-label={t("delete")} disabled={remove.isPending} onClick={() => remove.mutate(expense.id, { onSuccess: onClosed })}>
              <Trash2 aria-hidden />
            </Button>
          )}
        </div>
      )}
      {can("review") && <p className="text-caption text-slate">{t("reviewHint")}</p>}
      {can("edit") && <ExpenseFormDialog expense={expense} open={editing} onOpenChange={setEditing} />}
    </div>
  );
}
