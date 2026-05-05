"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";

import { unlockAchievement } from "@/components/achievements/achievement-db";
import {
  UNLOCK_HOLD_DURATION_MS,
  UNLOCK_REVEAL_DURATION_MS,
  UNLOCK_REVEAL_LUT_STEPS,
  sortAchievements,
} from "@/components/achievements/achievement-manager-utils";
import type { AchievementRecord } from "@/components/achievements/achievement-transformers";
import { useAchievementSounds } from "@/components/achievements/use-achievement-sounds";
import {
  buildUnlockRevealClipPath,
  buildUnlockRevealClipPathLut,
  estimateUnlockRevealCompletionProgress,
  type AlphaMaskData,
} from "@/lib/badge/shape-utils";
import { getCachedAlphaMaskData } from "@/lib/badge/render-cache";
import { type createClient } from "@/lib/supabase/client";

type SupabaseClient = ReturnType<typeof createClient>;

type UseAchievementUnlockRevealArgs = {
  readOnly: boolean;
  detailAchievement: AchievementRecord | null;
  detailRenderSrc: string;
  isSaving: boolean;
  setIsSaving: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setAchievements: Dispatch<SetStateAction<AchievementRecord[]>>;
  supabase: SupabaseClient;
};

export function useAchievementUnlockReveal({
  readOnly,
  detailAchievement,
  detailRenderSrc,
  isSaving,
  setIsSaving,
  setError,
  setAchievements,
  supabase,
}: UseAchievementUnlockRevealArgs) {
  const [isUnlockHolding, setIsUnlockHolding] = useState(false);
  const [unlockingAchievementId, setUnlockingAchievementId] = useState<string | null>(null);
  const [optimisticUnlockedAchievementId, setOptimisticUnlockedAchievementId] = useState<string | null>(null);
  const [unlockRevealProgress, setUnlockRevealProgress] = useState(0);

  const unlockHoldTimeoutRef = useRef<number | null>(null);
  const unlockRevealRafRef = useRef<number | null>(null);
  const unlockHoldPressedRef = useRef(false);
  const unlockRevealProgressRef = useRef(0);
  const unlockRevealCompleteProgressRef = useRef(1);
  const unlockRevealResolverRef = useRef<((result: "completed" | "cancelled") => void) | null>(null);
  const unlockAlphaMaskRef = useRef<AlphaMaskData | null>(null);

  const {
    stopUnlockSound,
    playUnlockTimelineSound,
    playUnlockEaseOutSound,
    primeUnlockAudioGestureContext,
    playSavePop,
  } = useAchievementSounds();

  const detailIsUnlocking =
    Boolean(detailAchievement?.id) && unlockingAchievementId === detailAchievement?.id;
  const detailIsLockedUi =
    Boolean(detailAchievement?.is_locked) &&
    optimisticUnlockedAchievementId !== detailAchievement?.id;
  const detailFloating = !detailIsLockedUi && !detailIsUnlocking;

  const unlockRevealClipPathLut = useMemo(
    () => (detailAchievement ? buildUnlockRevealClipPathLut() : null),
    [detailAchievement],
  );
  const unlockRevealClipPath = useMemo(() => {
    if (!unlockRevealClipPathLut || unlockRevealClipPathLut.length === 0) {
      return buildUnlockRevealClipPath(
        unlockRevealProgress,
        unlockRevealProgress * Math.PI * 3.6,
      );
    }
    const idx = Math.max(
      0,
      Math.min(
        UNLOCK_REVEAL_LUT_STEPS,
        Math.round(unlockRevealProgress * UNLOCK_REVEAL_LUT_STEPS),
      ),
    );
    return unlockRevealClipPathLut[idx];
  }, [unlockRevealProgress, unlockRevealClipPathLut]);

  useEffect(() => {
    unlockRevealProgressRef.current = unlockRevealProgress;
  }, [unlockRevealProgress]);

  useEffect(() => {
    const src = detailRenderSrc;
    unlockAlphaMaskRef.current = null;
    unlockRevealCompleteProgressRef.current = 1;
    if (readOnly || !detailIsLockedUi) return;
    if (!src) return;

    let cancelled = false;
    const loader = getCachedAlphaMaskData(src);
    void loader.then((maskData: AlphaMaskData | null) => {
      if (cancelled) return;
      unlockAlphaMaskRef.current = maskData;
      unlockRevealCompleteProgressRef.current = maskData
        ? estimateUnlockRevealCompletionProgress(maskData)
        : 1;
    });
    return () => {
      cancelled = true;
    };
  }, [detailRenderSrc, detailIsLockedUi, readOnly]);

  const cancelUnlockHold = useCallback(() => {
    unlockHoldPressedRef.current = false;
    if (unlockHoldTimeoutRef.current !== null) {
      window.clearTimeout(unlockHoldTimeoutRef.current);
      unlockHoldTimeoutRef.current = null;
    }
    setIsUnlockHolding(false);
  }, []);

  const interruptUnlockReveal = useCallback(() => {
    if (unlockRevealRafRef.current !== null) {
      cancelAnimationFrame(unlockRevealRafRef.current);
      unlockRevealRafRef.current = null;
    }
    const resolver = unlockRevealResolverRef.current;
    unlockRevealResolverRef.current = null;
    resolver?.("cancelled");
  }, []);

  const resetUnlockWave = useCallback(() => {
    interruptUnlockReveal();
    stopUnlockSound();
    cancelUnlockHold();
    setUnlockingAchievementId(null);
    setOptimisticUnlockedAchievementId(null);
    setUnlockRevealProgress(0);
  }, [cancelUnlockHold, interruptUnlockReveal, stopUnlockSound]);

  const handlePressHoldUnlock = useCallback(async () => {
    if (readOnly) return;
    if (!detailAchievement || !detailAchievement.is_locked || isSaving) return;
    const targetId = detailAchievement.id;

    const animateReveal = (
      targetProgress: number,
      durationMs: number,
      requireHold: boolean,
    ) =>
      new Promise<"completed" | "cancelled">((resolve) => {
        interruptUnlockReveal();
        const finish = (result: "completed" | "cancelled") => {
          if (unlockRevealResolverRef.current === finish) {
            unlockRevealResolverRef.current = null;
          }
          resolve(result);
        };
        unlockRevealResolverRef.current = finish;
        const fromProgress = unlockRevealProgressRef.current;
        if (durationMs <= 0 || Math.abs(targetProgress - fromProgress) < 0.0001) {
          setUnlockRevealProgress(targetProgress);
          finish(requireHold && !unlockHoldPressedRef.current ? "cancelled" : "completed");
          return;
        }
        let startTs: number | null = null;
        const tick = (ts: number) => {
          if (startTs === null) startTs = ts;
          const elapsed = ts - startTs;
          const t = Math.min(elapsed / durationMs, 1);
          const linearProgress = fromProgress + (targetProgress - fromProgress) * t;
          const completionScale = unlockRevealCompleteProgressRef.current || 1;
          const nextProgress =
            targetProgress >= fromProgress
              ? Math.min(1, linearProgress / completionScale)
              : linearProgress;
          setUnlockRevealProgress(nextProgress);

          if (requireHold && !unlockHoldPressedRef.current) {
            unlockRevealRafRef.current = null;
            finish("cancelled");
            return;
          }
          if (nextProgress >= 1 || t >= 1) {
            unlockRevealRafRef.current = null;
            finish("completed");
            return;
          }
          unlockRevealRafRef.current = requestAnimationFrame(tick);
        };
        unlockRevealRafRef.current = requestAnimationFrame(tick);
      });

    setUnlockingAchievementId(detailAchievement.id);
    setIsSaving(true);
    setError(null);
    const forwardDuration = Math.max(
      120,
      Math.round(
        Math.max(0, 1 - unlockRevealProgressRef.current) * UNLOCK_REVEAL_DURATION_MS,
      ),
    );
    const forwardResult = await animateReveal(1, forwardDuration, true);
    if (forwardResult === "cancelled") {
      stopUnlockSound();
      const closeDuration = Math.max(
        120,
        Math.round(unlockRevealProgressRef.current * UNLOCK_REVEAL_DURATION_MS),
      );
      setIsSaving(false);
      void animateReveal(0, closeDuration, false).then((rollbackResult) => {
        if (rollbackResult !== "completed") return;
        setUnlockingAchievementId(null);
        setUnlockRevealProgress(0);
      });
      return;
    }

    setAchievements((prev) =>
      sortAchievements(
        prev.map((achievement) =>
          achievement.id === targetId ? { ...achievement, is_locked: false } : achievement,
        ),
      ),
    );
    setOptimisticUnlockedAchievementId(targetId);
    setUnlockingAchievementId(null);
    setUnlockRevealProgress(0);
    stopUnlockSound();
    playUnlockEaseOutSound();
    setIsSaving(false);

    const unlockResult = await unlockAchievement(supabase, targetId);
    if (unlockResult.isErr()) {
      setError(unlockResult.error);
      setAchievements((prev) =>
        sortAchievements(
          prev.map((achievement) =>
            achievement.id === targetId ? { ...achievement, is_locked: true } : achievement,
          ),
        ),
      );
      setOptimisticUnlockedAchievementId(null);
      stopUnlockSound();
      return;
    }

    const unlockedAchievement = unlockResult.value;
    setAchievements((prev) =>
      sortAchievements(
        prev.map((achievement) =>
          achievement.id === unlockedAchievement.id ? unlockedAchievement : achievement,
        ),
      ),
    );
    setOptimisticUnlockedAchievementId(null);
  }, [
    detailAchievement,
    interruptUnlockReveal,
    isSaving,
    playUnlockEaseOutSound,
    readOnly,
    setAchievements,
    setError,
    setIsSaving,
    stopUnlockSound,
    supabase,
  ]);

  const startUnlockHold = useCallback(() => {
    if (readOnly) return;
    if (!detailIsLockedUi || isSaving || unlockHoldTimeoutRef.current !== null) return;
    unlockHoldPressedRef.current = true;
    setIsUnlockHolding(true);
    primeUnlockAudioGestureContext();
    unlockHoldTimeoutRef.current = window.setTimeout(() => {
      unlockHoldTimeoutRef.current = null;
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
      if (unlockHoldTimeoutRef.current !== null) {
        window.clearTimeout(unlockHoldTimeoutRef.current);
      }
      interruptUnlockReveal();
      stopUnlockSound();
    };
  }, [interruptUnlockReveal, stopUnlockSound]);

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
    unlockRevealClipPath,
    unlockAlphaMaskRef,
    cancelUnlockHold,
    startUnlockHold,
    resetUnlockWave,
  };
}
