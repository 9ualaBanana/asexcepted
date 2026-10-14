"use client";

import { Check, ExternalLink, X } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

import { normalizeOriginUrl } from "@/lib/achievements/domain/achievement";

const originIconClass =
  "size-3 shrink-0 text-white/40 transition-colors hover:text-white/80";

export function AchievementOriginHeading({
  as: Tag,
  title,
  originUrl,
  id,
  className,
}: {
  as: "h1" | "h2";
  title: string;
  originUrl: string | null;
  id?: string;
  className?: string;
}) {
  const href = normalizeOriginUrl(originUrl);
  if (!href) {
    return (
      <Tag id={id} className={className}>
        {title}
      </Tag>
    );
  }

  return (
    <Tag id={id} className={className}>
      <span className="relative inline">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-inherit no-underline"
        >
          {title}
        </a>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open origin"
          className="absolute top-1/2 left-full ml-1 inline-flex -translate-y-1/2"
        >
          <ExternalLink className={originIconClass} aria-hidden />
        </a>
      </span>
    </Tag>
  );
}

export function AchievementOriginTitleField({
  text,
  originUrl,
  disabled,
  onCommit,
  children,
}: {
  text: string;
  originUrl: string;
  disabled: boolean;
  onCommit: (originUrl: string) => void;
  children: ReactNode;
}) {
  const measureRef = useRef<HTMLSpanElement>(null);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [textWidth, setTextWidth] = useState(0);
  const [open, setOpen] = useState(false);

  useLayoutEffect(() => {
    setTextWidth(measureRef.current?.offsetWidth ?? 0);
  }, [text]);

  return (
    <div className="relative mt-1.5 w-full max-w-md px-1">
      {children}
      <span
        ref={measureRef}
        className="pointer-events-none invisible absolute top-0 left-0 text-xl leading-tight font-semibold whitespace-pre"
        aria-hidden
      >
        {text || " "}
      </span>
      <button
        ref={anchorRef}
        type="button"
        aria-label="Edit origin link"
        aria-expanded={open}
        disabled={disabled}
        className="absolute top-1/2 inline-flex -translate-y-1/2 disabled:opacity-40"
        style={{ left: `calc(50% + ${textWidth / 2}px + 4px)` }}
        onClick={() => setOpen((current) => !current)}
      >
        <ExternalLink className={originIconClass} aria-hidden />
      </button>
      {open ? (
        <OriginUrlField
          anchorRef={anchorRef}
          originUrl={originUrl}
          onCommit={onCommit}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}

function OriginUrlField({
  anchorRef,
  originUrl,
  onCommit,
  onClose,
}: {
  anchorRef: RefObject<HTMLButtonElement | null>;
  originUrl: string;
  onCommit: (originUrl: string) => void;
  onClose: () => void;
}) {
  const fieldId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState(originUrl);
  const [error, setError] = useState<string | null>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [top, setTop] = useState<number | null>(null);

  useLayoutEffect(() => {
    const nextHost = document.querySelector<HTMLElement>(
      "[data-achievement-dialog-scroller]",
    );
    const anchor = anchorRef.current;
    if (!nextHost || !anchor) return;
    const hostRect = nextHost.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    setHost(nextHost);
    setTop(anchorRect.top - hostRect.top + nextHost.scrollTop - 8);
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (!host || top == null) return;
    inputRef.current?.focus();
  }, [host, top]);

  useEffect(() => {
    if (!host || top == null) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [anchorRef, host, onClose, top]);

  function save() {
    const trimmed = draft.trim();
    if (!trimmed) {
      onCommit("");
      onClose();
      return;
    }
    const normalized = normalizeOriginUrl(trimmed);
    if (!normalized) {
      setError("Use an http or https link.");
      return;
    }
    onCommit(normalized);
    onClose();
  }

  function erase() {
    onCommit("");
    onClose();
  }

  const panel = (
    <div
      ref={panelRef}
      className="pointer-events-auto absolute left-1/2 z-30 w-[min(18rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-full rounded-xl border border-white/15 bg-[#14121c] p-2 text-left shadow-[0_16px_40px_rgba(0,0,0,0.55)]"
      style={{ top }}
    >
      <div className="flex items-center gap-1">
        <label htmlFor={fieldId} className="sr-only">
          Origin URL
        </label>
        <input
          ref={inputRef}
          id={fieldId}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setError(null);
          }}
          placeholder="https://"
          className="h-9 min-w-0 flex-1 rounded-md border border-white/10 bg-[#14121c] px-2 text-sm text-white outline-none placeholder:text-white/35"
        />
        <button
          type="button"
          aria-label="Save origin link"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/15"
          onClick={save}
        >
          <Check className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Erase origin link"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
          onClick={erase}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      {error ? <p className="mt-2 px-1 text-xs text-rose-200/90">{error}</p> : null}
    </div>
  );

  if (!host || top == null) return null;
  return createPortal(panel, host);
}
