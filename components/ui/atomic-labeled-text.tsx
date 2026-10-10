"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type AtomicLabeledTextProps = {
  prefix: string;
  children: ReactNode;
  className?: string;
  measureKey?: string;
};

export function AtomicLabeledText({
  prefix,
  children,
  className,
  measureKey,
}: AtomicLabeledTextProps) {
  const rowRef = useRef<HTMLParagraphElement>(null);
  const [stack, setStack] = useState(false);

  useLayoutEffect(() => {
    if (measureKey === undefined) return;
    const row = rowRef.current;
    if (!row) return;
    const prefixEl = row.querySelector<HTMLElement>("[data-atomic-prefix]");
    const valueEl = row.querySelector<HTMLElement>("[data-atomic-value]");
    if (!prefixEl || !valueEl) return;

    const scrambleWidth = valueEl.scrollWidth;
    if (scrambleWidth === 0) return;

    let locked = false;
    const apply = () => {
      const gap = Number.parseFloat(getComputedStyle(row).columnGap) || 0;
      const needed = prefixEl.offsetWidth + gap + scrambleWidth;
      if (needed > row.clientWidth + 1) locked = true;
      setStack(locked);
    };

    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(row);
    return () => observer.disconnect();
  }, [measureKey, prefix]);

  return (
    <p
      ref={rowRef}
      className={cn(
        "flex max-w-full justify-center text-center",
        stack ? "flex-col items-center" : "flex-wrap items-baseline gap-x-1",
        className,
      )}
    >
      <span data-atomic-prefix className="whitespace-nowrap">
        {prefix}
      </span>
      <span data-atomic-value className="max-w-full whitespace-nowrap">
        {children}
      </span>
    </p>
  );
}
