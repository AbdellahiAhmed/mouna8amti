import { cn } from "@/lib/cn";

// The MNT monogram drawn as one stroke inside a rounded tile (validated Claude Design concept).
const MONOGRAM = "M8 26V10l5 7 5-7v16M18 10l7 16V10M21.5 10h7";

/** `tone="light"` draws a white tile with a green monogram, for dark backgrounds. */
export function LogoMark({ className, tone = "brand" }: { className?: string; tone?: "brand" | "light" }) {
  return (
    <svg viewBox="0 0 36 36" aria-hidden="true" className={cn("size-9 shrink-0", className)}>
      <rect width="36" height="36" rx="10" className={tone === "light" ? "fill-white" : "fill-primary"} />
      <path
        d={MONOGRAM}
        fill="none"
        strokeWidth="2.6"
        strokeLinecap="square"
        strokeLinejoin="miter"
        className={tone === "light" ? "stroke-night" : "stroke-white"}
      />
    </svg>
  );
}

export function Logo({ className, tone = "brand" }: { className?: string; tone?: "brand" | "light" }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)} aria-label="منظمتي">
      <LogoMark tone={tone} />
      <span
        aria-hidden
        className={cn("font-display text-[1.3rem] font-semibold leading-tight", tone === "light" ? "text-white" : "text-night")}
      >
        منظمتي
      </span>
    </span>
  );
}
