export type ImageKitTelemetryOp =
  | "delete_file"
  | "client_upload"
  | "cdn_delivery"
  | "grid_prewarm"
  | "upload_probe";

export type ImageKitTelemetryPayload = {
  op: ImageKitTelemetryOp;
  ok?: boolean;
  durationMs?: number;
  fileIdPrefix?: string;
  fileBytes?: number;
  srcHost?: string;
  reason?: string;
  transferSize?: number;
  encodedBodySize?: number;
  decodedBodySize?: number;
  scheduled?: number;
  skippedCached?: number;
  skippedHidden?: number;
  message?: string;
};

const EVENT = "imagekit";

export function logImageKitEvent(payload: ImageKitTelemetryPayload): void {
  console.log(JSON.stringify({ event: EVENT, ...payload }));
}

export function fileIdPrefix(fileId: string): string {
  const trimmed = fileId.trim();
  return trimmed.length <= 8 ? trimmed : trimmed.slice(0, 8);
}

export async function withImageKitTiming<T>(
  op: ImageKitTelemetryOp,
  fn: () => Promise<T>,
  extra?: Omit<ImageKitTelemetryPayload, "op" | "durationMs" | "ok">,
): Promise<T> {
  const started = Date.now();
  try {
    const result = await fn();
    logImageKitEvent({
      op,
      ok: true,
      durationMs: Date.now() - started,
      ...extra,
    });
    return result;
  } catch (e) {
    logImageKitEvent({
      op,
      ok: false,
      durationMs: Date.now() - started,
      message: e instanceof Error ? e.message : String(e),
      ...extra,
    });
    throw e;
  }
}

function srcHost(src: string): string | undefined {
  try {
    return new URL(src).hostname;
  } catch {
    return undefined;
  }
}

function isImageKitCdnHost(hostname: string): boolean {
  return hostname.endsWith("imagekit.io");
}

/** Read Resource Timing for a completed image URL (browser only). */
export function readCdnDeliveryBytes(src: string): {
  transferSize?: number;
  encodedBodySize?: number;
  decodedBodySize?: number;
} {
  if (typeof window === "undefined" || typeof performance === "undefined") {
    return {};
  }
  const entries = performance.getEntriesByName(src, "resource");
  const entry = entries[entries.length - 1] as PerformanceResourceTiming | undefined;
  if (!entry) return {};
  return {
    transferSize: entry.transferSize,
    encodedBodySize: entry.encodedBodySize,
    decodedBodySize: entry.decodedBodySize,
  };
}

const loggedCdnDelivery = new Set<string>();

/**
 * Log first successful CDN decode per URL (client). Call after image load settles.
 */
export function logCdnDeliveryOnce(src: string, reason: string): void {
  if (typeof window === "undefined") return;
  if (loggedCdnDelivery.has(src)) return;
  let host: string;
  try {
    host = new URL(src).hostname;
  } catch {
    return;
  }
  if (!isImageKitCdnHost(host)) return;

  loggedCdnDelivery.add(src);
  const bytes = readCdnDeliveryBytes(src);
  logImageKitEvent({
    op: "cdn_delivery",
    ok: true,
    srcHost: host,
    reason,
    ...bytes,
  });
}
