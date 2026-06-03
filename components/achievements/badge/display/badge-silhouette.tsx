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

export function BadgeSilhouetteShadow({ src }: { src: string }) {
  return (
    <div
      aria-hidden
      className="badge-silhouette-shadow"
      style={badgeSilhouetteMaskStyle(src)}
    />
  );
}
