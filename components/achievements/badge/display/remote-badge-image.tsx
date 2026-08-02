"use client";

import { useEffect, useRef, useState } from "react";

import {
  ensureBadgeImageDecoded,
  isBadgeImageDecodeSettled,
} from "@/lib/achievements/badge/shared/render-cache";
import { cn } from "@/lib/utils";

export function RemoteBadgeImage({
  src,
  className,
  onDecoded,
}: {
  src: string;
  className?: string;
  onDecoded?: () => void;
}) {
  const [ready, setReady] = useState(() => isBadgeImageDecodeSettled(src));
  const onDecodedRef = useRef(onDecoded);
  onDecodedRef.current = onDecoded;

  useEffect(() => {
    let cancelled = false;

    if (isBadgeImageDecodeSettled(src)) {
      setReady(true);
      onDecodedRef.current?.();
      return;
    }

    setReady(false);
    void ensureBadgeImageDecoded(src).then(() => {
      if (!cancelled) {
        setReady(true);
        onDecodedRef.current?.();
      }
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
