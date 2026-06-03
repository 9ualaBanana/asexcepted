import type { CSSProperties } from "react";

export function badgeSilhouetteMaskStyle(src: string): CSSProperties {
  const safeSrc = src.replace(/"/g, '\\"');
  const maskUrl = `url("${safeSrc}")`;
  return {
    WebkitMaskImage: maskUrl,
    maskImage: maskUrl,
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
    WebkitMaskSize: "contain",
    maskSize: "contain",
  };
}

type BadgeSilhouetteLayerProps = {
  silhouette: boolean;
  locked: boolean;
  src: string | null;
};

/** Decorative silhouette behind badge art. */
export function BadgeSilhouetteLayer({
  silhouette,
  locked,
  src,
}: BadgeSilhouetteLayerProps) {
  if (!silhouette || locked || !src) {
    return null;
  }

  return (
    <div
      aria-hidden
      className="badge-silhouette-shadow"
      style={badgeSilhouetteMaskStyle(src)}
    />
  );
}
