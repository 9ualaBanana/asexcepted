import type { CSSProperties } from "react";

const UNLOCK_REVEAL_LUT_STEPS = 220;
const OPAQUE_ALPHA_THRESHOLD = 10;
const BADGE_ART_PAD_PX = 4;

export type AlphaMaskData = {
  data: Uint8ClampedArray;
  width: number;
  height: number;
};

export function buildUnlockRevealClipPath(progress: number, phase: number) {
  const p = Math.max(0, Math.min(1, progress));
  if (p <= 0) return "circle(0% at 50% 50%)";
  if (p >= 1) return "circle(120% at 50% 50%)";
  if (p < 0.035) {
    const earlyRadius = (p / 0.035) * 6;
    return `circle(${earlyRadius.toFixed(2)}% at 50% 50%)`;
  }

  const points: string[] = [];
  const segments = 72;
  const baseRadius = p * 72;
  const amplitude = Math.max(0.7, 3.4 * (1 - p) + 0.7);

  for (let i = 0; i < segments; i += 1) {
    const theta = (i / segments) * Math.PI * 2;
    const waveA = Math.sin(theta * 5 + phase) * amplitude;
    const waveB = Math.sin(theta * 9 - phase * 1.2) * amplitude * 0.45;
    const radius = Math.max(0, Math.min(84, baseRadius + waveA + waveB));
    const x = 50 + Math.cos(theta) * radius;
    const y = 50 + Math.sin(theta) * radius;
    points.push(`${x.toFixed(2)}% ${y.toFixed(2)}%`);
  }

  return `polygon(${points.join(",")})`;
}

export function buildUnlockRevealClipPathLut() {
  const lut: string[] = [];
  for (let i = 0; i <= UNLOCK_REVEAL_LUT_STEPS; i += 1) {
    const p = i / UNLOCK_REVEAL_LUT_STEPS;
    lut.push(buildUnlockRevealClipPath(p, p * Math.PI * 3.6));
  }
  return lut;
}

export function unlockRevealLutSteps() {
  return UNLOCK_REVEAL_LUT_STEPS;
}

export function getAlphaMaskStyle(src: string): CSSProperties {
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

export function estimateUnlockRevealCompletionProgress(mask: AlphaMaskData) {
  let maxDist = 0;
  const { data, width, height } = mask;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha <= OPAQUE_ALPHA_THRESHOLD) continue;
      const nx = (x + 0.5) / width - 0.5;
      const ny = (y + 0.5) / height - 0.5;
      const dist = Math.sqrt(nx * nx + ny * ny);
      if (dist > maxDist) maxDist = dist;
    }
  }

  const maxRadiusPct = maxDist * 100;
  const estimatedProgress = maxRadiusPct / 72;
  return Math.max(0.58, Math.min(1, estimatedProgress + 0.02));
}

export async function loadAlphaMaskDataFromImage(
  src: string,
): Promise<AlphaMaskData | null> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: AlphaMaskData | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const w = Math.max(1, img.naturalWidth || img.width || 1);
      const h = Math.max(1, img.naturalHeight || img.height || 1);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        finish(null);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      try {
        const imageData = ctx.getImageData(0, 0, w, h);
        finish({ data: imageData.data, width: w, height: h });
      } catch {
        finish(null);
      }
    };
    img.onerror = () => finish(null);
    img.src = src;
  });
}

export function isOpaqueBadgeHit(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  mask: AlphaMaskData | null,
) {
  const localX = clientX - rect.left;
  const localY = clientY - rect.top;
  if (localX < 0 || localY < 0 || localX > rect.width || localY > rect.height) {
    return false;
  }

  // Default / fallback badge: `rounded-full` disc — hit target is that circle, not the square slot corners.
  if (!mask) {
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const r = Math.min(rect.width, rect.height) / 2;
    const dx = localX - cx;
    const dy = localY - cy;
    return dx * dx + dy * dy <= r * r;
  }

  const innerW = Math.max(1, rect.width - BADGE_ART_PAD_PX * 2);
  const innerH = Math.max(1, rect.height - BADGE_ART_PAD_PX * 2);
  const scale = Math.min(innerW / mask.width, innerH / mask.height);
  const drawW = mask.width * scale;
  const drawH = mask.height * scale;
  const drawX = BADGE_ART_PAD_PX + (innerW - drawW) / 2;
  const drawY = BADGE_ART_PAD_PX + (innerH - drawH) / 2;

  if (
    localX < drawX ||
    localY < drawY ||
    localX > drawX + drawW ||
    localY > drawY + drawH
  ) {
    return false;
  }

  const srcX = Math.max(
    0,
    Math.min(mask.width - 1, Math.floor(((localX - drawX) / drawW) * mask.width)),
  );
  const srcY = Math.max(
    0,
    Math.min(mask.height - 1, Math.floor(((localY - drawY) / drawH) * mask.height)),
  );
  const alpha = mask.data[(srcY * mask.width + srcX) * 4 + 3];
  return alpha > OPAQUE_ALPHA_THRESHOLD;
}
