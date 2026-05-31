"use client";

type BadgeDebugOverlayProps = {
  detailIsModelBadge: boolean;
  detailOpenToImageDecodedMs: number | null;
  detailOpenToVisualReadyMs: number | null;
  detailOpenToModelUrlReadyMs: number | null;
  detailOpenToModelVisualReadyMs: number | null;
};

function formatMs(value: number | null): string {
  return value == null ? " -" : ` ${value}ms`;
}

function formatModelMetric(value: number | null, enabled: boolean): string {
  if (!enabled) return " N/A";
  return formatMs(value);
}

export function BadgeDebugOverlay({
  detailIsModelBadge,
  detailOpenToImageDecodedMs,
  detailOpenToVisualReadyMs,
  detailOpenToModelUrlReadyMs,
  detailOpenToModelVisualReadyMs,
}: BadgeDebugOverlayProps) {
  const decodedToVisualGap =
    detailOpenToVisualReadyMs == null || detailOpenToImageDecodedMs == null
      ? null
      : Math.max(0, detailOpenToVisualReadyMs - detailOpenToImageDecodedMs);

  const urlToModelVisualGap =
    detailIsModelBadge &&
    detailOpenToModelUrlReadyMs != null &&
    detailOpenToModelVisualReadyMs != null
      ? Math.max(0, detailOpenToModelVisualReadyMs - detailOpenToModelUrlReadyMs)
      : null;

  return (
    <div className="pointer-events-none fixed bottom-2 left-2 z-[9999] max-w-[min(100vw-1rem,28rem)] rounded-md border border-white/15 bg-black/70 px-2 py-1 text-[10px] text-white/80 backdrop-blur">
      <span className="font-semibold">Badge debug</span>
      <span className="ml-2 text-white/65">
        open→decoded:
        {formatMs(detailOpenToImageDecodedMs)}
      </span>
      <span className="ml-2 text-white/65">
        decoded→visual:
        {decodedToVisualGap == null ? " -" : ` ${decodedToVisualGap}ms`}
      </span>
      <span className="ml-2 text-white/65">
        open→visual:
        {formatMs(detailOpenToVisualReadyMs)}
      </span>
      <div className="mt-1 border-t border-white/10 pt-1 text-white/60">
        <span className="font-medium text-white/70">3D</span>
        <span className="ml-2">
          open→signed URL:
          {formatModelMetric(detailOpenToModelUrlReadyMs, detailIsModelBadge)}
        </span>
        <span className="ml-2">
          URL→GLB ready:
          {formatModelMetric(urlToModelVisualGap, detailIsModelBadge)}
        </span>
        <span className="ml-2">
          open→GLB ready:
          {formatModelMetric(detailOpenToModelVisualReadyMs, detailIsModelBadge)}
        </span>
      </div>
    </div>
  );
}
