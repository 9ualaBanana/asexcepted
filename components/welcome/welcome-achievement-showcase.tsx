"use client";

import { useMemo, useRef } from "react";

import { DetailBadgeInteractive } from "@/components/achievements/badge";
import { useAchievementDetailViewModel } from "@/components/achievements/detail/use-achievement-detail-view-model";
import { getWelcomeIntroAchievementRecord } from "@/lib/welcome/intro-achievement";
import { toOptimizedBadgeRenderSrc } from "@/lib/badge/render-src";
import type { AlphaMaskData } from "@/lib/badge/shape-utils";

const EMPTY_CLIP = "circle(0% at 50% 50%)";

/** Large badge; capped so header + meta + CTA fit on mobile. */
const WELCOME_BADGE_SLOT_CLASS =
  "w-[min(78vw,18rem)] max-w-[min(78vw,18rem)] sm:w-[min(82vw,20rem)] sm:max-w-[20rem] md:w-[min(88vw,22.5rem)] md:max-w-[22.5rem]";

/**
 * Inline detail badge (same component as achievement detail view), shown unlocked.
 */
export function WelcomeAchievementShowcase() {
  const achievement = useMemo(() => {
    const record = getWelcomeIntroAchievementRecord();
    return { ...record, is_locked: false };
  }, []);
  const renderSrc = useMemo(
    () => toOptimizedBadgeRenderSrc(achievement.icon_url?.trim() ?? ""),
    [achievement.icon_url],
  );
  const unlockAlphaMaskRef = useRef<AlphaMaskData | null>(null);

  const { DetailFallbackIcon, detailTone, detailMaskStyle } =
    useAchievementDetailViewModel({
      detailAchievement: achievement,
      detailRenderSrc: renderSrc,
      optimisticUnlockedAchievementId: null,
      detailIsLockedUi: false,
      readOnly: true,
    });

  if (!renderSrc) return null;

  return (
    <div className="flex w-full max-w-lg flex-col items-center">
      <DetailBadgeInteractive
        renderSrc={renderSrc}
        motionSeed={achievement.id}
        tone={detailTone}
        FallbackIcon={DetailFallbackIcon}
        hasIconUrl
        lockedUi={false}
        unlocking={false}
        detailMaskStyle={detailMaskStyle}
        unlockRevealClipPath={EMPTY_CLIP}
        unlockAlphaMaskRef={unlockAlphaMaskRef}
        slotClassName={WELCOME_BADGE_SLOT_CLASS}
      />

      <p className="mt-3 w-full shrink-0 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-white/45">
        {achievement.category?.trim() || "Uncategorized"}
      </p>
      <h2 className="mt-1.5 shrink-0 text-center text-lg font-semibold tracking-tight text-white sm:text-xl">
        {achievement.title?.trim() || "Untitled"}
      </h2>
      <p className="mt-2 max-w-xs shrink-0 text-center text-xs leading-relaxed text-white/60 sm:text-sm">
        {achievement.description?.trim() || "No description yet."}
      </p>
    </div>
  );
}
