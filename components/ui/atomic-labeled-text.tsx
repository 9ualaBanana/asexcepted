import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AtomicLabeledTextProps = {
  prefix: string;
  children: ReactNode;
  className?: string;
};

export function AtomicLabeledText({
  prefix,
  children,
  className,
}: AtomicLabeledTextProps) {
  return (
    <p
      className={cn(
        "flex max-w-full flex-col items-center justify-center text-center",
        className,
      )}
    >
      <span className="whitespace-nowrap">{prefix}</span>
      <span className="block max-w-full whitespace-nowrap">{children}</span>
    </p>
  );
}
