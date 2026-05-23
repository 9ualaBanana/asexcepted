export type ImageEdgeBounds = {
  minEdgePx?: number;
  maxEdgePx?: number;
};

async function readImageDimensions(
  file: File,
): Promise<{ width: number; height: number } | null> {
  const objectUrl = URL.createObjectURL(file);
  try {
    return await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () =>
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error("Could not read image."));
      img.src = objectUrl;
    });
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Returns an error message when the file fails validation, otherwise null. */
export async function validateImageEdgeBounds(
  file: File,
  bounds: ImageEdgeBounds,
): Promise<string | null> {
  if (!file.type.startsWith("image/")) {
    return "Please choose an image file.";
  }

  const dims = await readImageDimensions(file);
  if (!dims) {
    return "Could not read image dimensions.";
  }

  const { width, height } = dims;
  const { minEdgePx, maxEdgePx } = bounds;

  if (minEdgePx != null && (width < minEdgePx || height < minEdgePx)) {
    return `Image must be at least ${minEdgePx}×${minEdgePx} pixels on each side (yours is ${width}×${height}). Non-square images are fine — the full photo is shown inside the circle.`;
  }

  if (maxEdgePx != null && (width > maxEdgePx || height > maxEdgePx)) {
    return `Image must be at most ${maxEdgePx}×${maxEdgePx} pixels on each side (yours is ${width}×${height}).`;
  }

  return null;
}

/** @deprecated Use validateImageEdgeBounds with maxEdgePx */
export async function validateImageMaxEdgePx(
  file: File,
  maxEdgePx: number,
): Promise<string | null> {
  return validateImageEdgeBounds(file, { maxEdgePx });
}
