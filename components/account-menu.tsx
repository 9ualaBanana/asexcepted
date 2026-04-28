"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const linkClass =
  "text-xs font-medium text-muted-foreground/90 tracking-tight hover:text-foreground hover:underline underline-offset-2";

type AccountMenuProps = {
  label: string;
};

export function AccountMenu({ label }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId().replace(/:/g, "");
  const router = useRouter();
  const pathname = usePathname();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = rootRef.current;
      if (el && !el.contains(e.target as Node)) close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  return (
    <div
      ref={rootRef}
      className="relative inline-flex max-w-full flex-nowrap items-center justify-center overflow-visible"
    >
      <div
        id={panelId}
        role="region"
        aria-labelledby={`${panelId}-trigger`}
        className={cn(
          "pointer-events-none absolute right-[calc(100%+0.5rem)] top-1/2 -translate-y-1/2",
          "min-w-0 overflow-hidden transition-[max-width] duration-[420ms] motion-reduce:duration-0 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open ? "max-w-[10rem]" : "max-w-0",
        )}
      >
        <div
          className={cn(
            "flex min-w-max flex-nowrap items-center gap-2 origin-right transition-[opacity,transform] duration-300 ease-out motion-reduce:duration-0",
            open ? "opacity-100 scale-x-100" : "opacity-0 scale-x-95",
          )}
        >
          <Link
            href="/friends"
            onClick={close}
            className={cn(linkClass, "shrink-0 px-0.5 lowercase pointer-events-auto")}
          >
            friends
          </Link>
          <span
            className="shrink-0 select-none text-xs text-muted-foreground/80"
            aria-hidden
          >
            •
          </span>
        </div>
      </div>

      <button
        type="button"
        id={`${panelId}-trigger`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          if (!open) {
            setOpen(true);
            return;
          }
          setOpen(false);
          if (pathname === "/achievements") {
            if (typeof window !== "undefined") {
              window.location.assign("/achievements");
            }
            return;
          }
          router.push("/achievements");
        }}
        className={cn(
          linkClass,
          "max-w-[min(100%,14rem)] shrink-0 truncate bg-transparent p-0 shadow-none border-0 outline-none cursor-pointer",
        )}
      >
        {label}
      </button>

      <div
        className={cn(
          "pointer-events-none absolute left-[calc(100%+0.5rem)] top-1/2 -translate-y-1/2",
          "min-w-0 overflow-hidden transition-[max-width] duration-[420ms] motion-reduce:duration-0 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open ? "max-w-[10rem]" : "max-w-0",
        )}
      >
        <div
          className={cn(
            "flex min-w-max flex-nowrap items-center gap-2 origin-left transition-[opacity,transform] duration-300 ease-out motion-reduce:duration-0",
            open ? "opacity-100 scale-x-100" : "opacity-0 scale-x-95",
          )}
        >
          <span
            className="shrink-0 select-none text-xs text-muted-foreground/80"
            aria-hidden
          >
            •
          </span>
          <Link
            href="/profile"
            onClick={close}
            className={cn(linkClass, "shrink-0 px-0.5 lowercase pointer-events-auto")}
          >
            profile
          </Link>
        </div>
      </div>
    </div>
  );
}
