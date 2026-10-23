"use client";

import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { cn } from "@/lib/cn";

/** Header + loading / error / empty handling shared by the operations pages. */
export function PageFrame({
  title,
  subtitle,
  newLabel,
  onNew,
  query,
  isEmpty,
  emptyTitle,
  filters,
  children,
}: {
  title: string;
  subtitle: string;
  newLabel?: string;
  onNew?: () => void;
  query: { isPending: boolean; error: unknown; refetch: () => unknown };
  isEmpty: boolean;
  emptyTitle: string;
  filters?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[2rem] font-semibold leading-tight text-night dark:text-ink">{title}</h1>
          <p className="mt-1 text-body-lg text-slate">{subtitle}</p>
        </div>
        {onNew && newLabel && (
          <Button size="lg" variant="secondary" onClick={onNew}>
            <Plus aria-hidden />
            {newLabel}
          </Button>
        )}
      </header>
      {filters}
      {query.isPending ? (
        <div className="flex flex-col gap-3" role="status">
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-20 rounded-[18px]" />)}
        </div>
      ) : query.error ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : isEmpty ? (
        <EmptyState title={emptyTitle} />
      ) : (
        children
      )}
    </div>
  );
}

export function Chips<T extends string>({ value, options, label, onChange }: { value?: T; options: { value?: T; label: string }[]; label: string; onChange: (v?: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value ?? "all"}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex min-h-10 items-center rounded-full border px-4 text-[0.9375rem] font-medium transition-colors duration-150",
            value === o.value ? "border-primary bg-primary text-on-primary" : "border-hairline-strong bg-canvas text-charcoal hover:border-[#9cc9b6]",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
