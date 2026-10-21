import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export const fieldControlClass = cn(
  "h-11 w-full rounded-sm border border-hairline-strong bg-canvas px-3.5 text-body text-ink",
  "placeholder:text-stone transition-[border-color,box-shadow] duration-[120ms] ease-standard",
  "focus:border-primary focus:shadow-[0_0_0_3px_var(--primary-soft)] focus:outline-none",
  "aria-invalid:border-danger aria-invalid:focus:shadow-[0_0_0_3px_var(--danger-soft)]",
  "disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-stone",
);

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(fieldControlClass, className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(fieldControlClass, "cursor-pointer appearance-auto", className)} {...props} />;
}
