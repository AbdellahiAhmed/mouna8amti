"use client";

import { Check, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type SubmitEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/states";
import { useActivities, useDeleteActivity, useSaveActivity } from "@/features/finance/queries";
import { Card, CardHead, Pill, useDates } from "@/features/finance/ui";
import { useOrganization } from "@/features/organization/organization-context";
import { cn } from "@/lib/cn";
import type { Activity } from "@/lib/types";

const today = () => new Date().toISOString().slice(0, 10);

/** What the project must deliver; ticking one records the day it was done. */
export function ActivitiesCard({ projectId }: { projectId: number }) {
  const t = useTranslations("finance.activities");
  const dates = useDates();
  const { can } = useOrganization();
  const activities = useActivities(projectId);
  const save = useSaveActivity(projectId);
  const remove = useDeleteActivity();
  const [title, setTitle] = useState("");
  const canManage = can("projects.manage");
  const items = activities.data?.data ?? [];
  const done = items.filter((a) => a.done_on).length;

  const toggle = (a: Activity) => save.mutate({ id: a.id, title: a.title, due_on: a.due_on, done_on: a.done_on ? null : today() });

  function onAdd(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    save.mutate({ title: title.trim(), due_on: null, done_on: null }, { onSuccess: () => setTitle("") });
  }

  return (
    <Card>
      <CardHead title={t("title")}>
        {items.length > 0 && <span className="text-caption text-slate">{t("progress", { done, total: items.length })}</span>}
      </CardHead>
      {activities.isPending && <Skeleton className="mt-3 h-32" />}
      {activities.data && items.length === 0 && <p className="py-4 text-body text-slate">{t("empty")}</p>}
      <ul>
        {items.map((a) => (
          <li key={a.id} className="group flex items-center gap-3 border-t border-hairline-soft py-3 first:border-t-0">
            <button
              type="button"
              role="checkbox"
              aria-checked={Boolean(a.done_on)}
              aria-label={a.title}
              disabled={!canManage || save.isPending}
              onClick={() => toggle(a)}
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full border transition-colors duration-150",
                a.done_on ? "border-primary bg-primary text-on-primary" : "border-[#9cc9b6] text-transparent hover:text-primary",
                !canManage && "cursor-default",
              )}
            >
              <Check aria-hidden className="size-4" />
            </button>
            <span className="flex min-w-0 flex-1 flex-col leading-snug">
              <span className={cn("text-ink", a.done_on && "text-charcoal")}>{a.title}</span>
              {(a.done_on || a.due_on) && (
                <span className="text-caption text-slate">
                  {a.done_on ? t("doneOn", { date: dates.full(a.done_on) }) : t("dueOn", { date: dates.full(a.due_on!) })}
                </span>
              )}
            </span>
            <Pill tone={a.done_on ? "on" : "wait"}>{a.done_on ? t("done") : t("left")}</Pill>
            {canManage && (
              <Button variant="ghost" size="icon" aria-label={t("remove")} className="opacity-0 focus:opacity-100 group-hover:opacity-100" onClick={() => remove.mutate(a.id)}>
                <Trash2 aria-hidden />
              </Button>
            )}
          </li>
        ))}
      </ul>
      {canManage && (
        <form onSubmit={onAdd} className="mt-3 flex gap-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("placeholder")} maxLength={200} aria-label={t("add")} />
          <Button type="submit" variant="secondary" disabled={!title.trim() || save.isPending}>
            <Plus aria-hidden />
            {t("add")}
          </Button>
        </form>
      )}
    </Card>
  );
}
