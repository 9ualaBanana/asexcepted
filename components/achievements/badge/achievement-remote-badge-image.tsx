"use client";

import { LRUCache } from "lru-cache";
import { Suspense, use } from "react";

import { cn } from "@/lib/utils";

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

const remoteImageReady = new LRUCache<string, Promise<void>>({ max: 300 });

function preloadRemoteImage(src: string): Promise<void> {
  let p = remoteImageReady.get(src);
  if (!p) {
    p = loadImageElement(src);
    remoteImageReady.set(src, p);
  }
  return p;
}

function loadImageElement(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });
}
