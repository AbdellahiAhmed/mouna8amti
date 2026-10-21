import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-md border border-dashed border-hairline-strong bg-canvas px-6 py-16 text-center">
      <LogoMark className="size-12 opacity-80" />
      <p className="mt-5 font-display text-h4 text-ink">{title}</p>
      {children && <div className="mt-2 max-w-md text-body text-slate">{children}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const t = useTranslations("common");
  const message =
    error instanceof ApiError && error.code === "network_error"
      ? t("networkError")
      : error instanceof ApiError && error.status < 500
        ? error.message
        : t("serverError");

  return (
    <div role="alert" className="flex flex-col items-center rounded-md border border-hairline bg-canvas px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
        <AlertTriangle aria-hidden />
      </span>
      <p className="mt-5 font-display text-h4 text-ink">{t("errorTitle")}</p>
      <p className="mt-2 max-w-md text-body text-slate">{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-6" onClick={onRetry}>
          {t("retry")}
        </Button>
      )}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cn("block animate-pulse rounded-sm bg-surface-sunken", className)} />;
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  const t = useTranslations("common");
  return (
    <div role="status" className="overflow-hidden rounded-md border border-hairline bg-canvas">
      <span className="sr-only">{t("loading")}</span>
      <div className="h-12 bg-surface-sunken" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex h-[52px] items-center gap-6 border-t border-hairline-soft px-5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="ms-auto h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}
