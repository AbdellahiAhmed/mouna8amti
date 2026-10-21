import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Our type scale (globals.css) uses `text-<name>` like colours do. Without this,
// tailwind-merge treats `text-label` and `text-on-primary` as the same group and drops one.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["display-xl", "display-lg", "h1", "h2", "h3", "h4", "body-lg", "body", "table", "label", "caption"] },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
