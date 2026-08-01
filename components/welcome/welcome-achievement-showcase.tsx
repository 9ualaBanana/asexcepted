"use client";

import { useMemo, useRef } from "react";

import {
  Badge,
  badgeOptionsForDetailInteractive,
} from "@/components/achievements/badge";
import { useAchievementDetailViewModel } from "@/components/achievements/detail/use-achievement-detail-view-model";
import { getWelcomeIntroDetailViewModel } from "@/lib/welcome/intro-achievement";
import type { AlphaMaskData } from "@/lib/achievements/badge/parallax/shape-utils";

const EMPTY_CLIP = "circle(0% at 50% 50%)";

/** Large badge; capped so header + meta + CTA fit on mobile. */
const WELCOME_BADGE_SLOT_CLASS =
  "w-[min(78vw,18rem)] max-w-[min(78vw,18rem)] sm:w-[min(82vw,20rem)] sm:max-w-[20rem] md:w-[min(88vw,22.5rem)] md:max-w-[22.5rem]";

/**
 * Inline detail badge (same component as achievement detail view), shown unlocked.
 */
export function WelcomeAchievementShowcase() {
  const detail = useMemo(() => getWelcomeIntroDetailViewModel(), []);
  const renderSrc = detail.renderSrc;
  const unlockAlphaMaskRef = useRef<AlphaMaskData | null>(null);
  const unlockRevealClipPathRef = useRef(EMPTY_CLIP);

  const { DetailFallbackIcon, detailTone, detailMaskStyle } =
    useAchievementDetailViewModel({
      detailAchievement: detail,
      detailRenderSrc: renderSrc,
      optimisticUnlockedAchievementId: null,
      detailIsLockedUi: false,
      readOnly: true,
    });

  if (!renderSrc) return null;

  return (
    <div className="flex w-full max-w-lg flex-col items-center">
      <Badge
        options={badgeOptionsForDetailInteractive({
          renderSrc,
          motionSeed: detail.id,
          tone: detailTone,
          detail,
          lockedUi: false,
          unlocking: false,
          detailMaskStyle,
          unlockRevealClipPathRef,
          unlockAlphaMaskRef,
          slotClassName: WELCOME_BADGE_SLOT_CLASS,
          impressionSheen: false,
        })}
      />

      <p className="mt-3 w-full shrink-0 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-white/45">
        {detail.category?.trim() || "Uncategorized"}
      </p>
      <h2 className="mt-1.5 shrink-0 text-center text-lg font-semibold tracking-tight text-white sm:text-xl">
        {detail.title?.trim() || "Untitled"}
      </h2>
      <p className="mt-2 max-w-xs shrink-0 text-center text-xs leading-relaxed text-white/60 sm:text-sm">
        {detail.description?.trim() || "No description yet."}
      </p>
    </div>
  );
}
