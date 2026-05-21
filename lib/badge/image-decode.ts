"use client";

/**
 * Resolves once the image bytes are loaded and (if available) decode() has settled.
 */
export function decodeImageReadyPromise(src: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    const finish = () => resolve();
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      void (img.decode?.() ?? Promise.resolve())
        .then(finish)
        .catch(finish);
    };
    img.onerror = finish;
    img.src = src;
    if (img.complete) {
      void (img.decode?.() ?? Promise.resolve())
        .then(finish)
        .catch(finish);
    }
  });
}
