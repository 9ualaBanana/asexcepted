"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import { unlockAchievement } from "@/lib/achievements/data/achievement-repository";
import {
  UNLOCK_HOLD_DURATION_MS,
  UNLOCK_REVEAL_DURATION_MS,
  UNLOCK_REVEAL_LUT_STEPS,
} from "@/components/achievements/achievement-manager-utils";
import type { AchievementDetailViewModel } from "@/lib/achievements/data/achievement-view-models";
import {
  mapCollectionDetails,
  sortCollectionEntries,
  updateCollectionEntryDetail,
  type AchievementCollectionEntryViewModel,
} from "@/lib/achievements/data/achievement-view-models";
import { useAchievementSounds } from "@/components/achievements/badge/effects/use-achievement-sounds";
import { useRevealClipPathDriver } from "@/components/achievements/badge/effects/unlock-reveal-wave";
import {
  buildUnlockRevealClipPath,
  buildUnlockRevealClipPathLut,
  estimateUnlockRevealCompletionProgress,
  type AlphaMaskData,
} from "@/lib/achievements/badge/parallax/shape-utils";
import { ensureBadgeAlphaMaskData } from "@/lib/achievements/badge/shared/render-cache";
import { type createBrowserSupabase } from "@/lib/supabase/clients/browser";

type SupabaseClient = ReturnType<typeof createBrowserSupabase>;

type UseAchievementUnlockRevealArgs = {
  readOnly: boolean;
  detailAchievement: AchievementDetailViewModel | null;
  detailRenderSrc: string | null;
  detailViewSessionKey: number;
  isSaving: boolean;
  setIsSaving: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setAchievements: Dispatch<SetStateAction<AchievementCollectionEntryViewModel[]>>;
  supabase: SupabaseClient;
  onFirstUnlockComplete?: () => void;
  onFirstUnlockReverted?: () => void;
};

export function useAchievementUnlockReveal({
  readOnly,
  detailAchievement,
  detailRenderSrc,
  detailViewSessionKey,
  isSaving,
  setIsSaving,
  setError,
  setAchievements,
  supabase,
  onFirstUnlockComplete,
  onFirstUnlockReverted,
}: UseAchievementUnlockRevealArgs) {
  const onFirstUnlockCompleteRef = useRef(onFirstUnlockComplete);
  const onFirstUnlockRevertedRef = useRef(onFirstUnlockReverted);
  useEffect(() => {
    onFirstUnlockCompleteRef.current = onFirstUnlockComplete;
  }, [onFirstUnlockComplete]);
  useEffect(() => {
    onFirstUnlockRevertedRef.current = onFirstUnlockReverted;
  }, [onFirstUnlockReverted]);

  const [isUnlockHolding, setIsUnlockHolding] = useState(false);
  const [unlockingAchievementId, setUnlockingAchievementId] = useState<
    string | null
  >(null);
  const [optimisticUnlockedAchievementId, setOptimisticUnlockedAchievementId] =
    useState<string | null>(null);

  const holdTimeoutRef = useRef<number | null>(null);
  const revealRafRef = useRef<number | null>(null);
  const holdPressedRef = useRef(false);
  const revealCompletionScaleRef = useRef(1);
  const revealResolverRef = useRef<
    ((result: "completed" | "cancelled") => void) | null
  >(null);
  const unlockAlphaMaskRef = useRef<AlphaMaskData | null>(null);

  const {
    stopUnlockSound,
    playUnlockTimelineSound,
    playUnlockEaseOutSound,
    primeUnlockAudioGestureContext,
    playSavePop,
  } = useAchievementSounds();

  const detailIsUnlocking =
    Boolean(detailAchievement?.id) &&
    unlockingAchievementId === detailAchievement?.id;
  const detailIsLockedUi =
    Boolean(detailAchievement?.isLocked) &&
    optimisticUnlockedAchievementId !== detailAchievement?.id;
  const detailFloating = !detailIsLockedUi && !detailIsUnlocking;

  const clipPathLut = useMemo(
    () => (detailAchievement ? buildUnlockRevealClipPathLut() : null),
    [detailAchievement],
  );

  const buildClipPath = useCallback(
    (progress: number) => {
      if (!clipPathLut || clipPathLut.length === 0) {
        return buildUnlockRevealClipPath(
          progress,
          progress * Math.PI * 3.6,
        );
      }
      const idx = Math.max(
        0,
        Math.min(
          UNLOCK_REVEAL_LUT_STEPS,
          Math.round(progress * UNLOCK_REVEAL_LUT_STEPS),
        ),
      );
      return clipPathLut[idx];
    },
    [clipPathLut],
  );

  const revealClip = useRevealClipPathDriver(buildClipPath);

  const applyUnlockAlphaMask = useCallback((maskData: AlphaMaskData | null) => {
    unlockAlphaMaskRef.current = maskData;
    revealCompletionScaleRef.current = maskData
      ? estimateUnlockRevealCompletionProgress(maskData)
      : 1;
  }, []);

  const refreshUnlockAlphaMask = useCallback(() => {
    const src = detailRenderSrc;
    if (readOnly || !detailIsLockedUi || !src) return;
    void ensureBadgeAlphaMaskData(src).then(applyUnlockAlphaMask);
  }, [applyUnlockAlphaMask, detailIsLockedUi, detailRenderSrc, readOnly]);

  useEffect(() => {
    unlockAlphaMaskRef.current = null;
    revealCompletionScaleRef.current = 1;
    if (readOnly || !detailIsLockedUi || !detailRenderSrc) return;

    let cancelled = false;
    void ensureBadgeAlphaMaskData(detailRenderSrc).then((maskData) => {
      if (cancelled) return;
      applyUnlockAlphaMask(maskData);
    });
    return () => {
      cancelled = true;
    };
  }, [
    applyUnlockAlphaMask,
    detailIsLockedUi,
    detailRenderSrc,
    detailViewSessionKey,
    readOnly,
  ]);

  const cancelUnlockHold = useCallback(() => {
    holdPressedRef.current = false;
    if (holdTimeoutRef.current !== null) {
      window.clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    setIsUnlockHolding(false);
  }, []);

  const stopRevealAnimation = useCallback(() => {
    if (revealRafRef.current !== null) {
      cancelAnimationFrame(revealRafRef.current);
      revealRafRef.current = null;
    }
    const resolver = revealResolverRef.current;
    revealResolverRef.current = null;
    resolver?.("cancelled");
  }, []);

  const resetUnlockWave = useCallback(() => {
    stopRevealAnimation();
    stopUnlockSound();
    cancelUnlockHold();
    setUnlockingAchievementId(null);
    setOptimisticUnlockedAchievementId(null);
    revealClip.reset();
  }, [cancelUnlockHold, revealClip, stopRevealAnimation, stopUnlockSound]);

  const runRevealAnimation = useCallback(
    (
      targetProgress: number,
      durationMs: number,
      options: { cancelIfHoldReleased: boolean },
    ) =>
      new Promise<"completed" | "cancelled">((resolve) => {
        stopRevealAnimation();

        const finish = (result: "completed" | "cancelled") => {
          if (revealResolverRef.current === finish) {
            revealResolverRef.current = null;
          }
          resolve(result);
        };
        revealResolverRef.current = finish;

        const fromProgress = revealClip.progressRef.current;
        if (
          durationMs <= 0 ||
          Math.abs(targetProgress - fromProgress) < 0.0001
        ) {
          revealClip.setProgress(targetProgress);
          finish(
            options.cancelIfHoldReleased && !holdPressedRef.current
              ? "cancelled"
              : "completed",
          );
          return;
        }

        let startTs: number | null = null;
        const tick = (ts: number) => {
          if (startTs === null) startTs = ts;
          const t = Math.min((ts - startTs) / durationMs, 1);
          const linear = fromProgress + (targetProgress - fromProgress) * t;
          const scale = revealCompletionScaleRef.current || 1;
          const next =
            targetProgress >= fromProgress
              ? Math.min(1, linear / scale)
              : linear;

          revealClip.setProgress(next);

          if (options.cancelIfHoldReleased && !holdPressedRef.current) {
            revealRafRef.current = null;
            finish("cancelled");
            return;
          }
          if (next >= 1 || t >= 1) {
            revealRafRef.current = null;
            finish("completed");
            return;
          }
          revealRafRef.current = requestAnimationFrame(tick);
        };
        revealRafRef.current = requestAnimationFrame(tick);
      }),
    [revealClip, stopRevealAnimation],
  );

  const handlePressHoldUnlock = useCallback(async () => {
    if (readOnly) return;
    if (!detailAchievement || !detailAchievement.isLocked || isSaving) return;
    const targetId = detailAchievement.id;
    let hadUnlockedBefore = false;
    setAchievements((prev) => {
      hadUnlockedBefore = prev.some((entry) => !entry.detail.isLocked);
      return prev;
    });

    setUnlockingAchievementId(detailAchievement.id);
    setIsSaving(true);
    setError(null);

    const openMs = Math.max(
      120,
      Math.round(Math.max(0, 1 - revealClip.progressRef.current) * UNLOCK_REVEAL_DURATION_MS),
    );
    const openResult = await runRevealAnimation(1, openMs, {
      cancelIfHoldReleased: true,
    });

    if (openResult === "cancelled") {
      stopUnlockSound();
      const closeMs = Math.max(
        120,
        Math.round(revealClip.progressRef.current * UNLOCK_REVEAL_DURATION_MS),
      );
      setIsSaving(false);
      void runRevealAnimation(0, closeMs, {
        cancelIfHoldReleased: false,
      }).then((rollback) => {
        if (rollback !== "completed") return;
        setUnlockingAchievementId(null);
        revealClip.reset();
      });
      return;
    }

    setAchievements((prev) =>
      sortCollectionEntries(
        mapCollectionDetails(prev, (detail) =>
          detail.id === targetId ? { ...detail, isLocked: false } : detail,
        ),
      ),
    );
    setOptimisticUnlockedAchievementId(targetId);
    setUnlockingAchievementId(null);
    revealClip.reset();
    stopUnlockSound();
    playUnlockEaseOutSound();
    setIsSaving(false);

    if (!hadUnlockedBefore) {
      onFirstUnlockCompleteRef.current?.();
    }

    const unlockResult = await unlockAchievement(supabase, targetId);
    if (unlockResult.isErr()) {
      if (!hadUnlockedBefore) {
        onFirstUnlockRevertedRef.current?.();
      }
      setError(unlockResult.error);
      setAchievements((prev) =>
        sortCollectionEntries(
          mapCollectionDetails(prev, (detail) =>
            detail.id === targetId ? { ...detail, isLocked: true } : detail,
          ),
        ),
      );
      setOptimisticUnlockedAchievementId(null);
      stopUnlockSound();
      return;
    }

    const unlockedAchievement = unlockResult.value;
    setAchievements((prev) =>
      updateCollectionEntryDetail(prev, unlockedAchievement),
    );
    setOptimisticUnlockedAchievementId(null);

    void fetch("/api/push/fan-out-unlock", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ achievementId: unlockedAchievement.id }),
    }).catch(() => undefined);
  }, [
    detailAchievement,
    isSaving,
    playUnlockEaseOutSound,
    readOnly,
    revealClip,
    runRevealAnimation,
    setAchievements,
    setError,
    setIsSaving,
    stopUnlockSound,
    supabase,
  ]);

  const startUnlockHold = useCallback(() => {
    if (readOnly) return;
    if (!detailIsLockedUi || isSaving || holdTimeoutRef.current !== null) return;
    holdPressedRef.current = true;
    setIsUnlockHolding(true);
    primeUnlockAudioGestureContext();
    holdTimeoutRef.current = window.setTimeout(() => {
      holdTimeoutRef.current = null;
      setIsUnlockHolding(false);
      playUnlockTimelineSound();
      void handlePressHoldUnlock();
    }, UNLOCK_HOLD_DURATION_MS);
  }, [
    detailIsLockedUi,
    handlePressHoldUnlock,
    isSaving,
    playUnlockTimelineSound,
    primeUnlockAudioGestureContext,
    readOnly,
  ]);

  useEffect(() => {
    return () => {
      if (holdTimeoutRef.current !== null) {
        window.clearTimeout(holdTimeoutRef.current);
      }
      stopRevealAnimation();
      stopUnlockSound();
    };
  }, [stopRevealAnimation, stopUnlockSound]);

  useEffect(() => {
    if (!isUnlockHolding && !detailIsUnlocking) return;
    const onPointerEnd = () => cancelUnlockHold();
    window.addEventListener("pointerup", onPointerEnd);
    window.addEventListener("pointercancel", onPointerEnd);
    return () => {
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
    };
  }, [isUnlockHolding, detailIsUnlocking, cancelUnlockHold]);

  return {
    playSavePop,
    isUnlockHolding,
    detailIsUnlocking,
    detailIsLockedUi,
    detailFloating,
    optimisticUnlockedAchievementId,
    unlockRevealClipPathRef: revealClip.clipPathRef,
    unlockAlphaMaskRef,
    cancelUnlockHold,
    startUnlockHold,
    resetUnlockWave,
    refreshUnlockAlphaMask,
  };
}
