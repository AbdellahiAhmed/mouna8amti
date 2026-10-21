import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="text-h1 tracking-[-0.5px]">{title}</h1>
        {subtitle && <p className="mt-2 text-body-lg text-slate">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
