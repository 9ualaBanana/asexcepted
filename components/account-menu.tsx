"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { ROUTES, userCollection } from "@/lib/routes";
import { cn } from "@/lib/utils";

const linkClass =
  "relative text-xs font-medium text-muted-foreground/90 tracking-tight hover:text-foreground hover:underline underline-offset-2 transition-[color,transform] duration-200 ease-out motion-reduce:transition-none";

type TabId = "feed" | "social" | "collection" | "profile";

type TabDef = {
  id: TabId;
  label: string;
  href: string;
  isActive: boolean;
};

export type AccountMenuProps = {
  label: string;
  userId: string;
};

export function AccountMenu({ label, userId }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId().replace(/:/g, "");
  const tabRefs = useRef<(HTMLElement | null)[]>([]);
  const router = useRouter();
  const pathname = usePathname();
  const collectionPath = userCollection(userId);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [pressedIndex, setPressedIndex] = useState<number | null>(null);
  const [sliding, setSliding] = useState(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const didSlideRef = useRef(false);
  const suppressClickRef = useRef(false);

  const DRAG_THRESHOLD_PX = 8;

  const close = useCallback(() => setOpen(false), []);

  const tabs: TabDef[] = useMemo(
    () => [
      {
        id: "feed",
        label: "feed",
        href: ROUTES.feed,
        isActive: pathname === ROUTES.feed,
      },
      {
        id: "social",
        label: "social",
        href: ROUTES.social,
        isActive: pathname === ROUTES.social,
      },
      {
        id: "collection",
        label,
        href: collectionPath,
        isActive: pathname === collectionPath,
      },
      {
        id: "profile",
        label: "profile",
        href: ROUTES.profile,
        isActive: pathname === ROUTES.profile,
      },
    ],
    [collectionPath, label, pathname],
  );

  const activeIndex = tabs.findIndex((t) => t.isActive);

  const resolveIndexFromClientX = useCallback((clientX: number) => {
    if (!open) return 2;
    for (let i = 0; i < tabRefs.current.length; i++) {
      const el = tabRefs.current[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right) {
        return i;
      }
    }
    return null;
  }, [open]);

  const navigateToIndex = useCallback(
    (index: number) => {
      const tab = tabs[index];
      if (!tab) return;
      close();
      if (tab.id === "collection" && pathname === collectionPath) {
        window.location.assign(collectionPath);
        return;
      }
      router.push(tab.href);
    },
    [close, collectionPath, pathname, router, tabs],
  );

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    const index = resolveIndexFromClientX(e.clientX);
    if (index === null) return;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    didSlideRef.current = false;
    setSliding(false);
    setPressedIndex(index);
    setHoverIndex(index);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!pointerStartRef.current) return;
    const start = pointerStartRef.current;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
      didSlideRef.current = true;
      setSliding(true);
    }
    const index = resolveIndexFromClientX(e.clientX);
    setHoverIndex(index);
    if (!open && index !== null && index !== 2) {
      setOpen(true);
    }
  };

  const endPointer = (e: ReactPointerEvent, allowSlideNavigate: boolean) => {
    if (!pointerStartRef.current) return;
    const index = resolveIndexFromClientX(e.clientX);
    const slid = didSlideRef.current;
    pointerStartRef.current = null;
    didSlideRef.current = false;
    setSliding(false);
    setPressedIndex(null);
    setHoverIndex(null);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (allowSlideNavigate && slid && index !== null) {
      suppressClickRef.current = true;
      navigateToIndex(index);
    }
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDownOutside = (e: PointerEvent) => {
      const el = rootRef.current;
      if (el && !el.contains(e.target as Node)) close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointerDownOutside, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDownOutside, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  useEffect(() => {
    const onCancel = () => {
      pointerStartRef.current = null;
      didSlideRef.current = false;
      setSliding(false);
      setPressedIndex(null);
      setHoverIndex(null);
    };
    window.addEventListener("pointercancel", onCancel);
    return () => window.removeEventListener("pointercancel", onCancel);
  }, []);

  function scaleForIndex(index: number): number {
    const emphasized =
      sliding && hoverIndex !== null
        ? hoverIndex
        : pressedIndex !== null
          ? pressedIndex
          : activeIndex;
    if (index === emphasized && emphasized >= 0) {
      if (sliding && index === hoverIndex) return 1.12;
      if (pressedIndex === index) return 1.1;
      if (activeIndex === index) return 1.08;
    }
    return 1;
  }

  function tabVisualClass(index: number, base?: string) {
    const isActive = tabs[index]?.isActive ?? false;
    const isHovered =
      (sliding && hoverIndex === index) || pressedIndex === index;
    return cn(
      base,
      isActive || isHovered
        ? "text-foreground"
        : "text-muted-foreground/90 hover:text-foreground",
    );
  }

  function underlineClass(index: number) {
    const isActive = tabs[index]?.isActive ?? false;
    const isHovered =
      (sliding && hoverIndex === index) || pressedIndex === index;
    return cn(
      "pointer-events-none absolute inset-x-0 -bottom-0.5 h-px origin-center bg-foreground/80 transition-[opacity,transform] duration-200 motion-reduce:transition-none",
      isActive || isHovered ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0",
    );
  }

  const setTabRef = (index: number) => (el: HTMLElement | null) => {
    tabRefs.current[index] = el;
  };

  return (
    <div
      ref={rootRef}
      role="tablist"
      aria-label="Main navigation"
      className="relative inline-flex max-w-full flex-nowrap items-center justify-center overflow-visible"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => endPointer(e, true)}
      onPointerCancel={(e) => endPointer(e, false)}
    >
      <div
        id={panelId}
        role="region"
        aria-labelledby={`${panelId}-trigger`}
        className={cn(
          "pointer-events-none absolute right-[calc(100%+0.5rem)] top-1/2 -translate-y-1/2",
          "min-w-0 overflow-hidden transition-[max-width] duration-[420ms] motion-reduce:duration-0 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open ? "max-w-[12rem]" : "max-w-0",
        )}
      >
        <div
          className={cn(
            "flex min-w-max flex-nowrap items-center gap-2 origin-right transition-[opacity,transform] duration-300 ease-out motion-reduce:duration-0",
            open ? "opacity-100 scale-x-100" : "opacity-0 scale-x-95",
          )}
        >
          <Link
            ref={setTabRef(0)}
            href={ROUTES.feed}
            role="tab"
            aria-selected={tabs[0]?.isActive}
            onClick={(e) => {
              if (suppressClickRef.current) {
                e.preventDefault();
                suppressClickRef.current = false;
                return;
              }
              close();
            }}
            className={cn(
              linkClass,
              "inline-flex shrink-0 px-0.5 lowercase pointer-events-auto",
              tabVisualClass(0),
            )}
            style={{ transform: `scale(${scaleForIndex(0)})` }}
          >
            <span className="relative z-[1]">feed</span>
            <span className={underlineClass(0)} aria-hidden />
          </Link>
          <span
            className="shrink-0 select-none text-xs text-muted-foreground/80"
            aria-hidden
          >
            •
          </span>
          <Link
            ref={setTabRef(1)}
            href={ROUTES.social}
            role="tab"
            aria-selected={tabs[1]?.isActive}
            onClick={(e) => {
              if (suppressClickRef.current) {
                e.preventDefault();
                suppressClickRef.current = false;
                return;
              }
              close();
            }}
            className={cn(
              linkClass,
              "inline-flex shrink-0 px-0.5 lowercase pointer-events-auto",
              tabVisualClass(1),
            )}
            style={{ transform: `scale(${scaleForIndex(1)})` }}
          >
            <span className="relative z-[1]">social</span>
            <span className={underlineClass(1)} aria-hidden />
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
        ref={setTabRef(2)}
        role="tab"
        aria-selected={tabs[2]?.isActive}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
          }
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
          "inline-flex max-w-[min(100%,14rem)] shrink-0 truncate bg-transparent p-0 shadow-none border-0 outline-none cursor-pointer",
          tabVisualClass(2),
        )}
        style={{ transform: `scale(${scaleForIndex(2)})` }}
      >
        <span className="relative z-[1]">{label}</span>
        <span className={underlineClass(2)} aria-hidden />
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
            ref={setTabRef(3)}
            href={ROUTES.profile}
            role="tab"
            aria-selected={tabs[3]?.isActive}
            onClick={(e) => {
              if (suppressClickRef.current) {
                e.preventDefault();
                suppressClickRef.current = false;
                return;
              }
              close();
            }}
            className={cn(
              linkClass,
              "inline-flex shrink-0 px-0.5 lowercase pointer-events-auto",
              tabVisualClass(3),
            )}
            style={{ transform: `scale(${scaleForIndex(3)})` }}
          >
            <span className="relative z-[1]">profile</span>
            <span className={underlineClass(3)} aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
