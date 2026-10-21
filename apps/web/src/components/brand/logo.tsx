import { cn } from "@/lib/cn";

// MNT ligature: M, N and T share their stems — one connected block. Source: docs/brand/kit/mnt-symbol.svg.
const MNT_PATH =
  "M22.00 46.00 L52.00 46.00 L52.00 210.00 L22.00 210.00 Z M100.00 46.00 L130.00 46.00 L130.00 210.00 L100.00 210.00 Z M178.00 46.00 L208.00 46.00 L208.00 210.00 L178.00 210.00 Z M22.00 46.00 L52.00 46.00 L76.00 135.57 L100.00 46.00 L130.00 46.00 L91.00 191.55 L61.00 191.55 Z M100.00 46.00 L130.00 46.00 L208.00 210.00 L178.00 210.00 Z M155.00 46.00 L231.00 46.00 L231.00 76.00 L155.00 76.00 Z";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="22 46 209 164" aria-hidden="true" className={cn("h-7 w-auto fill-primary", className)}>
      <path d={MNT_PATH} />
    </svg>
  );
}

/** Horizontal lockup: the MNT mark with its full Arabic name, منظمتي. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)} aria-label="MNT — منظمتي">
      <LogoMark />
      <span aria-hidden className="h-5 w-px bg-hairline-strong" />
      <span aria-hidden className="font-display text-h4 font-medium text-ink" lang="ar">
        منظمتي
      </span>
    </span>
  );
}
