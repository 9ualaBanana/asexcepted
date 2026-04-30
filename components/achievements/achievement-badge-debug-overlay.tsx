"use client";

type AchievementBadgeDebugOverlayProps = {
  badgeRenderOptimized: boolean;
  detailOpenToImageDecodedMs: number | null;
  detailOpenToVisualReadyMs: number | null;
};

export function AchievementBadgeDebugOverlay({
  badgeRenderOptimized,
  detailOpenToImageDecodedMs,
  detailOpenToVisualReadyMs,
}: AchievementBadgeDebugOverlayProps) {
  return (
    <div className="pointer-events-none fixed bottom-2 left-2 z-[9999] rounded-md border border-white/15 bg-black/70 px-2 py-1 text-[10px] text-white/80 backdrop-blur">
      <span className="font-semibold">Badge debug</span>
      <span className="ml-2 text-white/65">
        mode:{badgeRenderOptimized ? "optimized" : "baseline"}
      </span>
      <span className="ml-2 text-white/65">
        open→decoded:
        {detailOpenToImageDecodedMs == null ? " -" : ` ${detailOpenToImageDecodedMs}ms`}
      </span>
      <span className="ml-2 text-white/65">
        decoded→visual:
        {detailOpenToVisualReadyMs == null || detailOpenToImageDecodedMs == null
          ? " -"
          : ` ${Math.max(0, detailOpenToVisualReadyMs - detailOpenToImageDecodedMs)}ms`}
      </span>
      <span className="ml-2 text-white/65">
        open→visual:
        {detailOpenToVisualReadyMs == null ? " -" : ` ${detailOpenToVisualReadyMs}ms`}
      </span>
    </div>
  );
}
