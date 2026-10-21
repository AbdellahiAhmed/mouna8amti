"use client";

import { animate, useInView, useReducedMotion } from "motion/react";
import { useLocale } from "next-intl";
import { useEffect, useRef } from "react";

/** Counts up to `value` the first time it scrolls into view (DESIGN.md › Motion › KPI value). */
export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const reduceMotion = useReducedMotion();
  const locale = useLocale();

  useEffect(() => {
    const node = ref.current;
    if (!node || !isInView) return;

    const format = new Intl.NumberFormat(locale === "ar" ? "ar-u-nu-latn" : locale).format;
    if (reduceMotion) {
      node.textContent = format(value);
      return;
    }

    const controls = animate(0, value, {
      duration: 1.2,
      ease: [0.2, 0, 0, 1],
      onUpdate: (latest) => (node.textContent = format(Math.round(latest))),
    });
    return () => controls.stop();
  }, [isInView, locale, reduceMotion, value]);

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      0
    </span>
  );
}
