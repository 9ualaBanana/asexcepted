"use client";

import { RemoteBadgeImage } from "@/components/achievements/badge/display/remote-badge-image";
import { cn } from "@/lib/utils";

export type BadgePreviewLayerVariant = "flat" | "poster" | "locked";

type BadgePreviewLayerProps = {
  src: string;
  variant: BadgePreviewLayerVariant;
  onDecoded?: () => void;
  imageClassName?: string;
  busy?: boolean;
};

/** Flat badge image: live flat, GLB poster, or locked underlay thumbnail. */
export function BadgePreviewLayer({
  src,
  variant,
  onDecoded,
  imageClassName,
  busy,
}: BadgePreviewLayerProps) {
  return (
    <RemoteBadgeImage
      src={src}
      className={cn(
        "h-full w-full",
        variant === "flat" && imageClassName,
        variant === "flat" &&
          busy &&
          "scale-[0.96] blur-[3.5px] opacity-[0.72]",
      )}
      onDecoded={onDecoded}
    />
  );
}
