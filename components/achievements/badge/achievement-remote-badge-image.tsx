"use client";

import { useEffect, useState } from "react";

import { ensureBadgeImageDecoded } from "@/lib/badge/render-cache";
import { cn } from "@/lib/utils";

/** Suspends until the remote badge URL has loaded, with a slot-sized shimmer fallback. */
export function RemoteBadgeImage({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    void ensureBadgeImageDecoded(src).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!ready) {
    return <RemoteBadgeImageFallback className={className} />;
  }

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
