"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useId, useRef, useState } from "react";
import { useEventListener } from "usehooks-ts";

import { ROUTES, userCollection } from "@/lib/routes";
import { cn } from "@/lib/utils";

const linkClass =
  "text-xs font-medium text-muted-foreground/90 tracking-tight hover:text-foreground hover:underline underline-offset-2";

type AccountMenuNavProps = {
  label: string;
  userId: string;
};

export function AccountMenuNav({ label, userId }: AccountMenuNavProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId().replace(/:/g, "");
  const router = useRouter();
  const pathname = usePathname();
  const collectionPath = userCollection(userId);

  const close = useCallback(() => setOpen(false), []);

  useEventListener(
    "pointerdown",
    (event) => {
      if (!open) return;
      const el = rootRef.current;
      if (el && !el.contains(event.target as Node)) close();
    },
    undefined,
    { capture: true },
  );

  useEventListener("keydown", (event) => {
    if (open && event.key === "Escape") close();
  });

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
          open ? "max-w-[6rem]" : "max-w-0",
        )}
      >
        <div
          className={cn(
            "flex min-w-max flex-nowrap items-center gap-2 origin-right transition-[opacity,transform] duration-300 ease-out motion-reduce:duration-0",
            open ? "opacity-100 scale-x-100" : "opacity-0 scale-x-95",
          )}
        >
          <Link
            href={ROUTES.inspa}
            onClick={close}
            className={cn(linkClass, "shrink-0 px-0.5 lowercase pointer-events-auto")}
          >
            inspa
          </Link>
          <span className="shrink-0 select-none text-xs text-muted-foreground/80" aria-hidden>
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
          if (pathname === collectionPath) {
            window.location.assign(collectionPath);
            return;
          }
          router.push(collectionPath);
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
          <span className="shrink-0 select-none text-xs text-muted-foreground/80" aria-hidden>
            •
          </span>
          <Link
            href={ROUTES.profile}
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
