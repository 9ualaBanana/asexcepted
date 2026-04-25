"use client";

import { Suspense, use } from "react";

import { cn } from "@/lib/utils";

const remoteImageReady = new Map<string, Promise<void>>();

/** Milliseconds to wait before starting the image load (Suspense skeleton). Set via `.env.local`: `NEXT_PUBLIC_DEBUG_BADGE_IMAGE_DELAY_MS=2000` */
const DEBUG_BADGE_IMAGE_DELAY_MS = (() => {
  const raw = process.env.NEXT_PUBLIC_DEBUG_BADGE_IMAGE_DELAY_MS;
  if (raw == null || raw === "") return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 30_000) : 0;
})();

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function loadImageElement(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
}

function preloadRemoteImage(src: string): Promise<void> {
  let p = remoteImageReady.get(src);
  if (!p) {
    p = (async () => {
      if (DEBUG_BADGE_IMAGE_DELAY_MS > 0) {
        await delay(DEBUG_BADGE_IMAGE_DELAY_MS);
      }
      await loadImageElement(src);
    })();
    remoteImageReady.set(src, p);
  }
  return p;
}

function RemoteBadgeImageInner({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  use(preloadRemoteImage(src));
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={cn("h-full w-full object-contain drop-shadow-md", className)}
    />
  );
}

function RemoteBadgeImageFallback({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "h-full w-full animate-pulse rounded-2xl bg-gradient-to-br from-white/[0.12] to-white/[0.04]",
        "ring-1 ring-inset ring-white/10",
        className,
      )}
    />
  );
}

/** Suspends until the remote badge URL has loaded, with a slot-sized shimmer fallback. */
export function RemoteBadgeImage({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  return (
    <Suspense fallback={<RemoteBadgeImageFallback className={className} />}>
      <RemoteBadgeImageInner src={src} className={className} />
    </Suspense>
  );
}
