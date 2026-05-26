"use client";

import { Info, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type BadgeAttributionPopoverProps = {
  value: string;
  editable?: boolean;
  onChange?: (value: string) => void;
  disabled?: boolean;
  title?: string;
  emptyState?: string;
  placeholder?: string;
  buttonClassName?: string;
  panelClassName?: string;
};

export function BadgeAttributionPopover({
  value,
  editable = false,
  onChange,
  disabled = false,
  title = "Attribution",
  emptyState = "No attribution provided yet.",
  placeholder = "Add creator, license, source link, or any CC attribution notes.",
  buttonClassName,
  panelClassName,
}: BadgeAttributionPopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="pointer-events-auto absolute left-3 top-3 z-40">
      <button
        type="button"
        aria-label="Badge attribution"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full border border-white/18 bg-black/35 text-white/80 shadow-lg backdrop-blur-md transition hover:bg-black/45 hover:text-white disabled:pointer-events-none disabled:opacity-50",
          buttonClassName,
        )}
      >
        <Info className="h-4 w-4" aria-hidden />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          className={cn(
            "absolute left-0 top-11 w-[min(20rem,72vw)] rounded-2xl border border-white/12 bg-[#14121c]/95 p-4 text-left text-white shadow-[0_20px_60px_rgba(0,0,0,0.42)] backdrop-blur-xl",
            panelClassName,
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p id={titleId} className="text-sm font-semibold text-white">
                {title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-white/55">
                {editable
                  ? "Shown on badge detail surfaces for 3D assets and any badge with attribution."
                  : "Attribution details for this badge asset."}
              </p>
            </div>
            <button
              type="button"
              aria-label="Close attribution"
              className="mt-0.5 rounded-full p-1 text-white/50 transition hover:bg-white/10 hover:text-white"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {editable ? (
            <textarea
              value={value}
              onChange={(event) => onChange?.(event.target.value)}
              rows={4}
              placeholder={placeholder}
              className="mt-3 min-h-[6.5rem] w-full resize-none rounded-xl border border-white/12 bg-white/[0.04] p-3 text-sm leading-relaxed text-white outline-none transition placeholder:text-white/28 focus:border-white/22"
            />
          ) : (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-white/72">
              {value.trim() || emptyState}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
