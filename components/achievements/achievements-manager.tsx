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
} from "@/components/achievements/achievement-manager-utils";
import { AchievementManualEmbedDialog } from "@/components/achievements/achievement-manual-embed-dialog";
import {
  clearSessionStagedUpload,
  deleteImageKitFileQuietly,
  rollbackBadgeUploadSession,
  getReplacedImageKitFileId,
  normalizeImageKitFileId,
} from "@/components/achievements/badge/badge-imagekit-session";
import {
  clearBadgeRenderCacheForSrc,
  prewarmBadgeRenderCache,
} from "@/lib/badge/render-cache";
import {
  getAlphaMaskStyle,
} from "@/lib/badge/shape-utils";
import {
  type BadgeIkSession,
  createEmptyBadgeIkSession,
  type FormState,
  getSafeIcon,
  hasMeaningfulContent,
} from "@/components/achievements/achievement-editor-shared";
import {
  useBadgeDebugOverlayPreference,
} from "@/lib/badge/debug-overlay-preference";
import { toOptimizedBadgeRenderSrc } from "@/lib/badge/render-src";
import { copyTextToClipboard } from "@/lib/copy-text-to-clipboard";
import { requestEmbedBadgeToken } from "@/lib/embed-api-client";
import { createClient } from "@/lib/supabase/client";
import { useBadgeDetailMetrics } from "@/components/achievements/use-badge-detail-metrics";
import { useAchievementUnlockReveal } from "@/components/achievements/use-achievement-unlock-reveal";
import {
  createAchievement,
  deleteAchievement,
  listAchievements,
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
  const [createUploadInProgress, setCreateUploadInProgress] = useState(false);
  const [panelUploadInProgress, setPanelUploadInProgress] = useState(false);

  const createBadgeIkSessionRef = useRef<BadgeIkSession>(createEmptyBadgeIkSession());
  const panelBadgeIkSessionRef = useRef<BadgeIkSession>(createEmptyBadgeIkSession());

  const detailAchievement = useMemo(() => {
    if (!detailAchievementId) return null;
    return achievements.find((a) => a.id === detailAchievementId) ?? null;
  }, [achievements, detailAchievementId]);
  const {
    markDetailOpenStart,
    handleDetailBadgeImageDecoded,
    handleDetailBadgeVisualReady,
    detailOpenToVisualReadyMs,
    detailOpenToImageDecodedMs,
  } = useBadgeDetailMetrics(detailAchievement);

  useEffect(() => {
    setEmbedCopyHint(null);
    setManualEmbedUrl(null);
  }, [detailAchievementId]);

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
  const detailRenderSrc = useMemo(() => {
    const src = detailAchievement?.icon_url?.trim() ?? "";
    if (!src) return "";
    return toOptimizedBadgeRenderSrc(src);
  }, [detailAchievement?.icon_url]);
  const {
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
  } = useAchievementUnlockReveal({
    readOnly,
    detailAchievement,
    detailRenderSrc,
    isSaving,
    setIsSaving,
    setError,
    setAchievements,
    supabase,
  });
  const detailMaskStyle = useMemo(() => {
    return detailRenderSrc ? getAlphaMaskStyle(detailRenderSrc) : null;
  }, [detailRenderSrc]);
  useEffect(() => {
    const src = detailRenderSrc;
    if (!src) return;
    prewarmBadgeRenderCache(src, {
      motionSeed: detailAchievement?.id ?? "detail-default",
      startCentered: optimisticUnlockedAchievementId === detailAchievement?.id,
      includeAlphaMaskData: !readOnly && detailIsLockedUi,
    });
  }, [
    detailRenderSrc,
    detailAchievement?.id,
    detailIsLockedUi,
    optimisticUnlockedAchievementId,
    readOnly,
  ]);
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
    if (achievements.length === 0) return;
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
  }, [achievements, achievementOverlayOpen]);

  function closeDetailPanel() {
    if (editorUploadInProgress) return;
    if (isCreating) {
      rollbackBadgeUploadSession(createBadgeIkSessionRef.current);
      setCreateForm(createInitialForm());
      setIsCreating(false);
      setCreateUploadInProgress(false);
    }
    if (detailMode === "edit" && detailAchievement) {
      rollbackBadgeUploadSession(panelBadgeIkSessionRef.current);
      setPanelForm(achievementToForm(detailAchievement));
      setPanelUploadInProgress(false);
    }
    setDetailAchievementId(null);
    setDetailMode("view");
    resetUnlockWave();
    setIsSaving(false);
    setEmbedCopyHint(null);
    setEmbedCopyBusy(false);
  }

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
    if (createdSrc) {
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
    if (targetSrc) {
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

  const onCancelCreate = useCallback(() => {
    if (createUploadInProgress) return;
    rollbackBadgeUploadSession(createBadgeIkSessionRef.current);
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
    rollbackBadgeUploadSession(panelBadgeIkSessionRef.current);
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

      {achievementOverlayOpen ? (
        <AchievementDialogStack
          readOnly={readOnly}
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
      ) : null}

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
          detailOpenToImageDecodedMs={detailOpenToImageDecodedMs}
          detailOpenToVisualReadyMs={detailOpenToVisualReadyMs}
        />
      ) : null}
    </div>
  );
}
