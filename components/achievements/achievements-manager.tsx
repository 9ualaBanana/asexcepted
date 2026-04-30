"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from "react";

import { type AchievementTone } from "@/components/achievements/achievement-card";
import { AchievementBadgeDebugOverlay } from "@/components/achievements/achievement-badge-debug-overlay";
import { AchievementDeleteConfirmDialog } from "@/components/achievements/achievement-delete-confirm-dialog";
import { AchievementDialogStack } from "@/components/achievements/achievement-dialog-stack";
import { AchievementGrid } from "@/components/achievements/achievement-grid";
import {
  createInitialForm,
  resolveTone,
  sortAchievements,
  tryGetHighResNow,
  UNLOCK_HOLD_DURATION_MS,
  UNLOCK_REVEAL_DURATION_MS,
  UNLOCK_REVEAL_LUT_STEPS,
} from "@/components/achievements/achievement-manager-utils";
import { AchievementManualEmbedDialog } from "@/components/achievements/achievement-manual-embed-dialog";
import {
  clearSessionStagedUpload,
  deleteImageKitFileQuietly,
  discardSessionStagedUpload,
  getReplacedImageKitFileId,
  normalizeImageKitFileId,
} from "@/components/achievements/badge/badge-imagekit-session";
import {
  clearBadgeRenderCacheForSrc,
  getCachedAlphaMaskData,
  prewarmBadgeRenderCache,
} from "@/components/achievements/badge/badge-render-cache";
import {
  buildUnlockRevealClipPath,
  buildUnlockRevealClipPathLut,
  estimateUnlockRevealCompletionProgress,
  getAlphaMaskStyle,
  loadAlphaMaskDataFromImage,
  type AlphaMaskData,
} from "@/components/achievements/badge/badge-shape-utils";
import {
  type BadgeIkSession,
  createEmptyBadgeIkSession,
  type FormState,
  getSafeIcon,
  hasMeaningfulContent,
} from "@/components/achievements/achievement-editor-shared";
import {
  useBadgeDebugOverlayPreference,
  useBadgeRenderOptimizedPreference,
} from "@/lib/badge-render-optimization";
import { toOptimizedBadgeRenderSrc } from "@/lib/badge-render-src";
import { copyTextToClipboard } from "@/lib/copy-text-to-clipboard";
import { requestEmbedBadgeToken } from "@/lib/embed-api-client";
import { createClient } from "@/lib/supabase/client";
import { useAchievementSounds } from "@/components/achievements/use-achievement-sounds";
import {
  createAchievement,
  deleteAchievement,
  listAchievements,
  unlockAchievement,
  updateAchievement,
} from "@/components/achievements/achievement-db";
import {
  achievementToGridItem,
  achievementToForm,
  formToPayload,
  type AchievementRecord,
} from "@/components/achievements/achievement-transformers";

export type AchievementsManagerProps = {
  /** Supabase Auth user id (`auth.users.id`); scopes achievements rows. */
  userId: string;
  /** When true, list and detail are view-only (no create / edit / delete / unlock). */
  readOnly: boolean;
};

export function AchievementsManager({
  userId,
  readOnly,
}: AchievementsManagerProps) {
  const supabase = useMemo(() => createClient(), []);
  const [badgeRenderOptimized] = useBadgeRenderOptimizedPreference();
  const [badgeDebugOverlay] = useBadgeDebugOverlayPreference();
  const [achievements, setAchievements] = useState<AchievementRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<FormState>(createInitialForm);
  const [isCreating, setIsCreating] = useState(false);
  const [detailAchievementId, setDetailAchievementId] = useState<string | null>(null);
  const [detailMode, setDetailMode] = useState<"view" | "edit">("view");
  const [panelForm, setPanelForm] = useState<FormState>(createInitialForm);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [embedCopyBusy, setEmbedCopyBusy] = useState(false);
  const [embedCopyHint, setEmbedCopyHint] = useState<string | null>(null);
  const [manualEmbedUrl, setManualEmbedUrl] = useState<string | null>(null);
  const [isUnlockHolding, setIsUnlockHolding] = useState(false);
  const [unlockingAchievementId, setUnlockingAchievementId] = useState<string | null>(null);
  const [optimisticUnlockedAchievementId, setOptimisticUnlockedAchievementId] = useState<string | null>(null);
  const [unlockRevealProgress, setUnlockRevealProgress] = useState(0);
  const [createUploadInProgress, setCreateUploadInProgress] = useState(false);
  const [panelUploadInProgress, setPanelUploadInProgress] = useState(false);

  const createBadgeIkSessionRef = useRef<BadgeIkSession>(createEmptyBadgeIkSession());
  const panelBadgeIkSessionRef = useRef<BadgeIkSession>(createEmptyBadgeIkSession());
  const unlockHoldTimeoutRef = useRef<number | null>(null);
  const unlockRevealRafRef = useRef<number | null>(null);
  const unlockHoldPressedRef = useRef(false);
  const unlockRevealProgressRef = useRef(0);
  const unlockRevealCompleteProgressRef = useRef(1);
  const unlockRevealResolverRef = useRef<((result: "completed" | "cancelled") => void) | null>(
    null,
  );
  const unlockAlphaMaskRef = useRef<AlphaMaskData | null>(null);
  const detailOpenStartedAtRef = useRef<number | null>(null);
  const detailPerfMeasuredForIdRef = useRef<string | null>(null);
  const detailImageDecodedMsRef = useRef<number | null>(null);
  const [detailOpenToVisualReadyMs, setDetailOpenToVisualReadyMs] = useState<number | null>(
    null,
  );
  const [detailOpenToImageDecodedMs, setDetailOpenToImageDecodedMs] = useState<number | null>(
    null,
  );
  const {
    stopUnlockSound,
    playUnlockTimelineSound,
    playUnlockEaseOutSound,
    primeUnlockAudioGestureContext,
    playSavePop,
  } = useAchievementSounds();

  function rollbackBadgeSession(ref: RefObject<BadgeIkSession>) {
    discardSessionStagedUpload(ref.current);
  }

  const detailAchievement = useMemo(() => {
    if (!detailAchievementId) return null;
    return achievements.find((a) => a.id === detailAchievementId) ?? null;
  }, [achievements, detailAchievementId]);

  useEffect(() => {
    setEmbedCopyHint(null);
    setManualEmbedUrl(null);
  }, [detailAchievementId]);

  const markDetailOpenStart = useCallback((achievementId: string) => {
    detailOpenStartedAtRef.current = tryGetHighResNow();
    detailPerfMeasuredForIdRef.current = achievementId;
    detailImageDecodedMsRef.current = null;
    setDetailOpenToImageDecodedMs(null);
    setDetailOpenToVisualReadyMs(null);
  }, []);

  const handleDetailBadgeImageDecoded = useCallback(() => {
    if (!detailAchievement?.id) return;
    if (detailPerfMeasuredForIdRef.current !== detailAchievement.id) return;
    if (detailOpenStartedAtRef.current == null) return;

    const elapsed = Math.max(0, Math.round(tryGetHighResNow() - detailOpenStartedAtRef.current));
    detailImageDecodedMsRef.current = elapsed;
    setDetailOpenToImageDecodedMs(elapsed);
  }, [detailAchievement?.id]);

  const handleDetailBadgeVisualReady = useCallback(() => {
    if (!detailAchievement?.id) return;
    if (detailPerfMeasuredForIdRef.current !== detailAchievement.id) return;
    if (detailOpenStartedAtRef.current == null) return;

    const elapsed = Math.max(0, Math.round(tryGetHighResNow() - detailOpenStartedAtRef.current));
    setDetailOpenToVisualReadyMs(elapsed);
    detailPerfMeasuredForIdRef.current = null;
  }, [detailAchievement?.id]);

  useEffect(() => {
    if (!detailAchievement?.id) return;
    if (!detailAchievement.icon_url?.trim()) return;
    if (detailPerfMeasuredForIdRef.current !== detailAchievement.id) return;

    const timeout = window.setTimeout(() => {
      if (detailPerfMeasuredForIdRef.current !== detailAchievement.id) return;
      if (detailOpenStartedAtRef.current == null) return;
      
      const elapsed = Math.max(0, Math.round(tryGetHighResNow() - detailOpenStartedAtRef.current));
      if (detailImageDecodedMsRef.current == null) {
        detailImageDecodedMsRef.current = elapsed;
        setDetailOpenToImageDecodedMs(elapsed);
      }
      setDetailOpenToVisualReadyMs(elapsed);
      detailPerfMeasuredForIdRef.current = null;
    }, 2200);
    return () => window.clearTimeout(timeout);
  }, [detailAchievement?.icon_url, detailAchievement?.id]);

  const copyEmbedLink = useCallback(async () => {
    if (!detailAchievement?.id) return;
    setEmbedCopyBusy(true);
    setEmbedCopyHint(null);
    let embedUrlForFallback = "";
    try {
      const tokenResult = await requestEmbedBadgeToken(detailAchievement.id);
      if (tokenResult.isErr()) {
        setEmbedCopyHint(tokenResult.error);
        return;
      }
      const { embedUrl } = tokenResult.value;
      embedUrlForFallback = embedUrl;
      const copied = await copyTextToClipboard(embedUrl);
      if (!copied) {
        setManualEmbedUrl(embedUrl);
        setEmbedCopyHint("Copy was blocked. Use the manual copy sheet below.");
        window.setTimeout(() => setEmbedCopyHint(null), 3000);
        return;
      }
      setEmbedCopyHint("Embed link copied.");
      window.setTimeout(() => setEmbedCopyHint(null), 2500);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not copy link.";
      if (/not allowed|denied permission|permission/i.test(msg)) {
        if (embedUrlForFallback) {
          setManualEmbedUrl(embedUrlForFallback);
        }
        setEmbedCopyHint(
          "Clipboard permission was blocked. Use the manual copy sheet below.",
        );
      } else {
        setEmbedCopyHint(msg);
      }
    } finally {
      setEmbedCopyBusy(false);
    }
  }, [detailAchievement?.id]);

  const DetailFallbackIcon = getSafeIcon(detailAchievement?.icon);
  const detailTone: AchievementTone = useMemo(
    () => resolveTone(detailAchievement),
    [detailAchievement]
  );
  const detailIsUnlocking =
    Boolean(detailAchievement?.id) && unlockingAchievementId === detailAchievement?.id;
  const detailIsLockedUi =
    Boolean(detailAchievement?.is_locked) &&
    optimisticUnlockedAchievementId !== detailAchievement?.id;
  const detailFloating = !detailIsLockedUi && !detailIsUnlocking;
  const detailRenderSrc = useMemo(() => {
    const src = detailAchievement?.icon_url?.trim() ?? "";
    if (!src) return "";
    return badgeRenderOptimized ? toOptimizedBadgeRenderSrc(src) : src;
  }, [badgeRenderOptimized, detailAchievement?.icon_url]);
  const detailMaskStyle = useMemo(() => {
    return detailRenderSrc ? getAlphaMaskStyle(detailRenderSrc) : null;
  }, [detailRenderSrc]);
  useEffect(() => {
    if (!badgeRenderOptimized) return;
    const src = detailRenderSrc;
    if (!src) return;
    prewarmBadgeRenderCache(src, {
      motionSeed: detailAchievement?.id ?? "detail-default",
      startCentered: optimisticUnlockedAchievementId === detailAchievement?.id,
      includeAlphaMaskData: !readOnly && detailIsLockedUi,
    });
  }, [
    badgeRenderOptimized,
    detailRenderSrc,
    detailAchievement?.id,
    detailIsLockedUi,
    optimisticUnlockedAchievementId,
    readOnly,
  ]);
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
    const loader = badgeRenderOptimized
      ? getCachedAlphaMaskData(src)
      : loadAlphaMaskDataFromImage(src);
    void loader.then((maskData) => {
      if (cancelled) return;
      unlockAlphaMaskRef.current = maskData;
      unlockRevealCompleteProgressRef.current = maskData
        ? estimateUnlockRevealCompletionProgress(maskData)
        : 1;
    });

    return () => {
      cancelled = true;
    };
  }, [badgeRenderOptimized, detailRenderSrc, detailIsLockedUi, readOnly]);

  useEffect(() => {
    if (
      detailAchievementId &&
      !achievements.some((a) => a.id === detailAchievementId)
    ) {
      setDetailAchievementId(null);
      setDetailMode("view");
    }
  }, [achievements, detailAchievementId]);

  const achievementOverlayOpen = Boolean(detailAchievement) || isCreating;
  const editorUploadInProgress =
    (isCreating && createUploadInProgress) ||
    (detailMode === "edit" && panelUploadInProgress);

  /** Chunked prewarm: avoids one idle callback decoding every badge while detail is open. */
  useEffect(() => {
    if (!badgeRenderOptimized || achievements.length === 0) return;
    if (achievementOverlayOpen) return;

    const jobs: { src: string; id: string }[] = [];
    for (const achievement of achievements) {
      const rawSrc = achievement.icon_url?.trim() ?? "";
      if (!rawSrc) continue;
      jobs.push({ src: toOptimizedBadgeRenderSrc(rawSrc), id: achievement.id });
    }
    if (jobs.length === 0) return;

    let cancelled = false;
    let index = 0;
    let rafId = 0;
    const CHUNK = 2;

    const pump = () => {
      if (cancelled) return;
      const end = Math.min(index + CHUNK, jobs.length);
      for (; index < end; index += 1) {
        const j = jobs[index];
        prewarmBadgeRenderCache(j.src, { motionSeed: j.id });
      }
      if (index < jobs.length) {
        rafId = requestAnimationFrame(pump);
      }
    };

    rafId = requestAnimationFrame(() => {
      rafId = requestAnimationFrame(pump);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [achievements, badgeRenderOptimized, achievementOverlayOpen]);

  function closeDetailPanel() {
    if (editorUploadInProgress) return;
    if (isCreating) {
      rollbackBadgeSession(createBadgeIkSessionRef);
      setCreateForm(createInitialForm());
      setIsCreating(false);
      setCreateUploadInProgress(false);
    }
    if (detailMode === "edit" && detailAchievement) {
      rollbackBadgeSession(panelBadgeIkSessionRef);
      setPanelForm(achievementToForm(detailAchievement));
      setPanelUploadInProgress(false);
    }
    setDetailAchievementId(null);
    setDetailMode("view");
    interruptUnlockReveal();
    stopUnlockSound();
    cancelUnlockHold();
    setUnlockingAchievementId(null);
    setOptimisticUnlockedAchievementId(null);
    setUnlockRevealProgress(0);
    setIsSaving(false);
    setEmbedCopyHint(null);
    setEmbedCopyBusy(false);
  }

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

  const loadAchievements = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await listAchievements(supabase, userId);

    if (result.isErr()) {
      setError(result.error);
      setAchievements([]);
      setIsLoading(false);
      return;
    }

    const loadedAchievements = result.value;
    setAchievements(sortAchievements(loadedAchievements));
    setIsLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    void loadAchievements();
  }, [loadAchievements]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    if (!hasMeaningfulContent(createForm)) {
      setError("Add at least a title, category, or description.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const insertPayload = formToPayload(createForm);
    const result = await createAchievement(supabase, insertPayload);

    if (result.isErr()) {
      setError(result.error);
      setIsSaving(false);
      return;
    }

    const createdAchievement = result.value;
    const createdSrc = createdAchievement.icon_url?.trim() ?? "";
    if (badgeRenderOptimized && createdSrc) {
      const renderSrc = toOptimizedBadgeRenderSrc(createdSrc);
      prewarmBadgeRenderCache(createdSrc, {
        motionSeed: createdAchievement.id,
        includeAlphaMaskData: Boolean(createdAchievement.is_locked) && !readOnly,
      });
      prewarmBadgeRenderCache(renderSrc, { motionSeed: createdAchievement.id });
    }
    playSavePop();
    setAchievements((prev) => sortAchievements([createdAchievement, ...prev]));
    setCreateForm(createInitialForm());
    createBadgeIkSessionRef.current = createEmptyBadgeIkSession();
    setIsSaving(false);
    setIsCreating(false);
    setDetailAchievementId(null);
    setDetailMode("view");
  }

  async function handlePanelSave(e: FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    if (!detailAchievementId) return;
    if (!hasMeaningfulContent(panelForm)) {
      setError("Add at least a title, category, or description.");
      return;
    }

    setIsSaving(true);
    setError(null);

    const updatePayload = formToPayload(panelForm);
    const result = await updateAchievement(
      supabase,
      detailAchievementId,
      updatePayload,
    );

    if (result.isErr()) {
      setError(result.error);
      setIsSaving(false);
      return;
    }

    const updatedAchievement = result.value;
    const previousSrc = detailAchievement?.icon_url?.trim() ?? "";
    const nextSrc = updatedAchievement.icon_url?.trim() ?? "";
    if (badgeRenderOptimized) {
      if (previousSrc && previousSrc !== nextSrc) {
        clearBadgeRenderCacheForSrc(previousSrc);
        clearBadgeRenderCacheForSrc(toOptimizedBadgeRenderSrc(previousSrc));
      }
      if (nextSrc) {
        const renderSrc = toOptimizedBadgeRenderSrc(nextSrc);
        prewarmBadgeRenderCache(nextSrc, {
          motionSeed: updatedAchievement.id,
          includeAlphaMaskData: Boolean(updatedAchievement.is_locked) && !readOnly,
        });
        prewarmBadgeRenderCache(renderSrc, { motionSeed: updatedAchievement.id });
      }
    }
    playSavePop();

    const baselineId = normalizeImageKitFileId(panelBadgeIkSessionRef.current.baselineFileId);
    const savedFileId = normalizeImageKitFileId(updatedAchievement.icon_file_id);
    const replacedBaselineId = getReplacedImageKitFileId(baselineId, savedFileId);
    if (replacedBaselineId) {
      void deleteImageKitFileQuietly(replacedBaselineId);
    }
    panelBadgeIkSessionRef.current = {
      baselineUrl: (updatedAchievement.icon_url ?? "").trim(),
      baselineFileId: savedFileId,
      lastSessionFileId: panelBadgeIkSessionRef.current.lastSessionFileId,
    };
    clearSessionStagedUpload(panelBadgeIkSessionRef.current);

    setAchievements((prev) =>
      sortAchievements(
        prev.map((achievement) =>
          achievement.id === updatedAchievement.id ? updatedAchievement : achievement,
        ),
      ),
    );
    setDetailMode("view");
    setIsSaving(false);
  }

  async function handleDelete(id: string) {
    if (readOnly) return;
    setIsSaving(true);
    setError(null);

    const target = achievements.find((a) => a.id === id);
    const ikId = normalizeImageKitFileId(target?.icon_file_id);
    const targetSrc = target?.icon_url?.trim() ?? "";
    await deleteImageKitFileQuietly(ikId, (e) =>
      console.warn("ImageKit delete on achievement remove", e),
    );

    const deleteResult = await deleteAchievement(supabase, id);

    if (deleteResult.isErr()) {
      setError(deleteResult.error);
      setIsSaving(false);
      return;
    }

    setAchievements((prev) => prev.filter((achievement) => achievement.id !== id));
    if (badgeRenderOptimized && targetSrc) {
      clearBadgeRenderCacheForSrc(targetSrc);
      clearBadgeRenderCacheForSrc(toOptimizedBadgeRenderSrc(targetSrc));
    }
    if (detailAchievementId === id) {
      setDetailAchievementId(null);
      setDetailMode("view");
    }
    setDeleteConfirmId(null);
    setIsSaving(false);
  }

  async function handlePressHoldUnlock() {
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
    setUnlockRevealProgress(0);
    setIsSaving(true);
    setError(null);
    const forwardResult = await animateReveal(1, UNLOCK_REVEAL_DURATION_MS, true);
    if (forwardResult === "cancelled") {
      stopUnlockSound();
      const closeDuration = Math.max(
        120,
        Math.round(unlockRevealProgressRef.current * UNLOCK_REVEAL_DURATION_MS),
      );
      await animateReveal(0, closeDuration, false);
      setIsSaving(false);
      setUnlockingAchievementId(null);
      setUnlockRevealProgress(0);
      return;
    }

    // End the visual sequence immediately when reveal reaches 100%.
    setAchievements((prev) =>
      sortAchievements(
        prev.map((achievement) =>
          achievement.id === targetId
            ? { ...achievement, is_locked: false }
            : achievement,
        ),
      ),
    );
    setOptimisticUnlockedAchievementId(targetId);
    setUnlockingAchievementId(null);
    setUnlockRevealProgress(0);
    stopUnlockSound();
    playUnlockEaseOutSound();
    // UI should be instantly interactive once reveal is complete.
    setIsSaving(false);

    const unlockResult = await unlockAchievement(supabase, targetId);

    if (unlockResult.isErr()) {
      setError(unlockResult.error);
      // Roll back optimistic unlock if persistence fails.
      setAchievements((prev) =>
        sortAchievements(
          prev.map((achievement) =>
            achievement.id === targetId
              ? { ...achievement, is_locked: true }
              : achievement,
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
  }

  function startUnlockHold() {
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
  }

  const onCancelCreate = useCallback(() => {
    if (createUploadInProgress) return;
    discardSessionStagedUpload(createBadgeIkSessionRef.current);
    setCreateForm(createInitialForm());
    setIsCreating(false);
    setCreateUploadInProgress(false);
    setDetailMode("view");
  }, [createUploadInProgress]);

  const onRequestPanelEdit = useCallback(() => {
    if (!detailAchievement) return;
    panelBadgeIkSessionRef.current = {
      baselineUrl: detailAchievement.icon_url ?? "",
      baselineFileId: detailAchievement.icon_file_id ?? "",
      lastSessionFileId: null,
    };
    setPanelForm(achievementToForm(detailAchievement));
    setDetailMode("edit");
  }, [detailAchievement]);

  const onCancelPanelEdit = useCallback(() => {
    if (panelUploadInProgress) return;
    discardSessionStagedUpload(panelBadgeIkSessionRef.current);
    if (detailAchievement) {
      setPanelForm(achievementToForm(detailAchievement));
    }
    setPanelUploadInProgress(false);
    setDetailMode("view");
  }, [panelUploadInProgress, detailAchievement]);

  const onManualEmbedCopied = useCallback(() => {
    setEmbedCopyHint("Embed link copied.");
    setManualEmbedUrl(null);
    window.setTimeout(() => setEmbedCopyHint(null), 2500);
  }, []);

  const gridItems = useMemo(
    () => achievements.map(achievementToGridItem),
    [achievements],
  );

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <AchievementGrid
        isLoading={isLoading}
        readOnly={readOnly}
        items={gridItems}
        onAddAchievement={() => {
          createBadgeIkSessionRef.current = createEmptyBadgeIkSession();
          setIsCreating(true);
          setDetailAchievementId(null);
          setDetailMode("edit");
          setCreateForm(createInitialForm());
        }}
        onSelectAchievement={(achievementId) => {
          markDetailOpenStart(achievementId);
          setDetailAchievementId(achievementId);
          setDetailMode("view");
          setIsCreating(false);
        }}
      />

      <AchievementDialogStack
        overlayOpen={achievementOverlayOpen}
        readOnly={readOnly}
        badgeRenderOptimized={badgeRenderOptimized}
        editorUploadInProgress={editorUploadInProgress}
        closeDetailPanel={closeDetailPanel}
        isCreating={isCreating}
        createForm={createForm}
        setCreateForm={setCreateForm}
        setCreateUploadInProgress={setCreateUploadInProgress}
        createBadgeIkSessionRef={createBadgeIkSessionRef}
        onSubmitCreate={handleCreate}
        onCancelCreate={onCancelCreate}
        detailMode={detailMode}
        detailAchievement={detailAchievement}
        panelForm={panelForm}
        setPanelForm={setPanelForm}
        setPanelUploadInProgress={setPanelUploadInProgress}
        panelBadgeIkSessionRef={panelBadgeIkSessionRef}
        onSubmitPanelSave={handlePanelSave}
        onCancelPanelEdit={onCancelPanelEdit}
        onRequestPanelEdit={onRequestPanelEdit}
        detailIsUnlocking={detailIsUnlocking}
        detailIsLockedUi={detailIsLockedUi}
        detailFloating={detailFloating}
        detailRenderSrc={detailRenderSrc}
        detailTone={detailTone}
        DetailFallbackIcon={DetailFallbackIcon}
        unlockRevealClipPath={unlockRevealClipPath}
        detailMaskStyle={detailMaskStyle}
        unlockAlphaMaskRef={unlockAlphaMaskRef}
        startUnlockHold={startUnlockHold}
        cancelUnlockHold={cancelUnlockHold}
        onDetailBadgeImageDecoded={handleDetailBadgeImageDecoded}
        onDetailBadgeVisualReady={handleDetailBadgeVisualReady}
        optimisticUnlockedAchievementId={optimisticUnlockedAchievementId}
        isSaving={isSaving}
        embedCopyBusy={embedCopyBusy}
        embedCopyHint={embedCopyHint}
        onCopyEmbedLink={copyEmbedLink}
        onRequestDelete={(id) => setDeleteConfirmId(id)}
      />

      {deleteConfirmId ? (
        <AchievementDeleteConfirmDialog
          isSaving={isSaving}
          onDismiss={() => setDeleteConfirmId(null)}
          onConfirm={() => void handleDelete(deleteConfirmId)}
        />
      ) : null}

      {manualEmbedUrl ? (
        <AchievementManualEmbedDialog
          manualEmbedUrl={manualEmbedUrl}
          onDismiss={() => setManualEmbedUrl(null)}
          onCopied={onManualEmbedCopied}
        />
      ) : null}

      {badgeDebugOverlay ? (
        <AchievementBadgeDebugOverlay
          badgeRenderOptimized={badgeRenderOptimized}
          detailOpenToImageDecodedMs={detailOpenToImageDecodedMs}
          detailOpenToVisualReadyMs={detailOpenToVisualReadyMs}
        />
      ) : null}
    </div>
  );
}
