import { cn } from "@/lib/cn";

// Rub el Hizb: two overlapping squares. The inner star is offset by 22.5°,
// and the gold centre is the only gold that ships in the chrome.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={cn("size-9", className)}>
      <path
        className="fill-primary"
        d="M50 6L62.89 18.89L81.11 18.89L81.11 37.11L94 50L81.11 62.89L81.11 81.11L62.89 81.11L50 94L37.11 81.11L18.89 81.11L18.89 62.89L6 50L18.89 37.11L18.89 18.89L37.11 18.89Z"
      />
      <path
        className="fill-surface"
        d="M60.44 24.8L64.76 35.24L75.2 39.56L70.88 50L75.2 60.44L64.76 64.76L60.44 75.2L50 70.88L39.56 75.2L35.24 64.76L24.8 60.44L29.12 50L24.8 39.56L35.24 35.24L39.56 24.8L50 29.12Z"
      />
      <circle cx="50" cy="50" r="9" className="fill-gold" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className="font-display text-h4 font-semibold text-ink">منظمتي</span>
        <span className="font-display text-caption tracking-wide text-steel" lang="en">
          Mouna8amti
        </span>
      </span>
    </span>
  );
}
