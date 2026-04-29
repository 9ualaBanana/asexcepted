"use client";

import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from "react";
import { Copy, Link2, PenLine, Sparkles, Trash2, X } from "lucide-react";

import {
  getSafeTone,
  type AchievementTone,
} from "@/components/achievements/achievement-card";
import { AchievementBadgeSlot } from "@/components/achievements/badge/achievement-badge-slot";
import { AchievementFallbackBadge } from "@/components/achievements/badge/achievement-fallback-badge";
import { AchievementGridItem } from "@/components/achievements/achievement-grid-item";
import { AchievementGridLoadingSkeleton } from "@/components/achievements/achievement-grid-skeleton";
import { AchievementBadge3DViewer } from "@/components/achievements/badge/achievement-badge-3d-viewer";
import {
  clearBadgeRenderCacheForSrc,
  getCachedAlphaMaskData,
  prewarmBadgeRenderCache,
} from "@/components/achievements/badge/badge-render-cache";
import { RemoteBadgeImage } from "@/components/achievements/badge/achievement-remote-badge-image";
import {
  buildUnlockRevealClipPath,
  buildUnlockRevealClipPathLut,
  estimateUnlockRevealCompletionProgress,
  getAlphaMaskStyle,
  isOpaqueBadgeHit,
  loadAlphaMaskDataFromImage,
  type AlphaMaskData,
  unlockRevealLutSteps,
} from "@/components/achievements/badge/badge-shape-utils";
import {
  type AchievementIconKey,
  achievementBadgeChromeWidth,
  achievementDialogChromeInset,
  achievementDialogIconBtn,
  type BadgeIkSession,
  createEmptyBadgeIkSession,
  type FormState,
  formatAchievedAt,
  formatGridDate,
  getSafeIcon,
  getSafeIconKey,
  hasMeaningfulContent,
  toNullable,
  todayDateString,
} from "@/components/achievements/achievement-editor-shared";
import { EditableAchievementCard } from "@/components/achievements/editable-achievement-card";
import { Button } from "@/components/ui/button";
import {
  useBadgeDebugOverlayPreference,
  useBadgeRenderOptimizedPreference,
} from "@/lib/badge-render-optimization";
import { toOptimizedBadgeRenderSrc } from "@/lib/badge-render-src";
import { createClient } from "@/lib/supabase/client";
import { deleteImageKitFile } from "@/lib/imagekit-client";
import { cn } from "@/lib/utils";

type AchievementRecord = {
  id: string;
  title: string | null;
  description: string | null;
  category: string | null;
  icon: AchievementIconKey;
  icon_url: string | null;
  icon_file_id: string | null;
  tone: AchievementTone;
  is_locked: boolean;
  achieved_at: string | null;
  created_at: string;
};

type AchievementPayloadBase = Omit<AchievementRecord, "id" | "created_at">;

type AchievementInsertPayload = AchievementPayloadBase;
type AchievementUpdatePayload = AchievementPayloadBase;

const INITIAL_FORM: FormState = {
  title: "",
  description: "",
  category: "",
  icon: "trophy",
  iconUrl: "",
  iconFileId: "",
  tone: "teal",
  isLocked: false,
  achievedAt: todayDateString(),
};

const SELECT_COLUMNS =
  "id,title,description,category,icon,icon_url,icon_file_id,tone,is_locked,achieved_at,created_at";
const UNLOCK_HOLD_DURATION_MS = 500;
const UNLOCK_REVEAL_DURATION_MS = 5000;
const UNLOCK_REVEAL_LUT_STEPS = unlockRevealLutSteps();
const AUDIO_ASSET_VERSION = process.env.NEXT_PUBLIC_BUILD_ID?.trim() || "dev";
const UNLOCK_PEEL_AUDIO_SRC = `/audio/unlock-peel.wav?v=${AUDIO_ASSET_VERSION}`;
const UNLOCK_EASE_OUT_AUDIO_SRC = `/audio/unlock-ease-out.wav?v=${AUDIO_ASSET_VERSION}`;
const SAVE_POP_AUDIO_SRC = `/audio/pop.mp3?v=${AUDIO_ASSET_VERSION}`;

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below handles browsers/contexts that block Clipboard API (common on iOS).
  }

  if (typeof document === "undefined") return false;
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.top = "-1000px";
  textarea.style.left = "-1000px";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  return copied;
}

function normalizeAchievement(row: Record<string, unknown>): AchievementRecord {
  return {
    id: String(row.id),
    title: (row.title as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    category: (row.category as string | null) ?? null,
    icon: getSafeIconKey(row.icon as string | null | undefined),
    icon_url: (row.icon_url as string | null) ?? null,
    icon_file_id: (row.icon_file_id as string | null) ?? null,
    tone: getSafeTone(row.tone as string | null | undefined),
    is_locked: Boolean(row.is_locked),
    achieved_at: (row.achieved_at as string | null) ?? null,
    created_at: String(row.created_at),
  };
}

function resolveTone(achievement: AchievementRecord | null) {
  return getSafeTone(achievement?.tone);
}

function achievementToForm(a: AchievementRecord): FormState {
  return {
    title: a.title ?? "",
    description: a.description ?? "",
    category: a.category ?? "",
    icon: getSafeIconKey(a.icon),
    iconUrl: a.icon_url ?? "",
    iconFileId: a.icon_file_id ?? "",
    tone: resolveTone(a),
    isLocked: Boolean(a.is_locked),
    achievedAt: a.achieved_at ?? "",
  };
}

function formToPayload(form: FormState): AchievementPayloadBase {
  return {
    title: toNullable(form.title),
    description: toNullable(form.description),
    category: toNullable(form.category),
    icon: form.icon,
    icon_url: toNullable(form.iconUrl),
    icon_file_id: form.iconFileId.trim() ? form.iconFileId.trim() : null,
    tone: form.tone,
    is_locked: form.isLocked,
    achieved_at: toNullable(form.achievedAt),
  };
}

function sortAchievements(rows: AchievementRecord[]) {
  return [...rows].sort((a, b) => {
    const aPrimary = a.achieved_at
      ? new Date(`${a.achieved_at}T23:59:59`).getTime()
      : new Date(a.created_at).getTime();
    const bPrimary = b.achieved_at
      ? new Date(`${b.achieved_at}T23:59:59`).getTime()
      : new Date(b.created_at).getTime();

    if (bPrimary !== aPrimary) {
      return bPrimary - aPrimary;
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export type AchievementsManagerProps = {
  /** Supabase Auth user id (`auth.users.id`); scopes achievements rows. */
  ownerUserId: string;
  /** When true, list and detail are view-only (no create / edit / delete / unlock). */
  readOnly?: boolean;
};

export function AchievementsManager({
  ownerUserId,
  readOnly = false,
}: AchievementsManagerProps) {
  const supabase = useMemo(() => createClient(), []);
  const [badgeRenderOptimized] = useBadgeRenderOptimizedPreference();
  const [badgeDebugOverlay] = useBadgeDebugOverlayPreference();
  const [achievements, setAchievements] = useState<AchievementRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<FormState>(INITIAL_FORM);
  const [isCreating, setIsCreating] = useState(false);
  const [detailAchievementId, setDetailAchievementId] = useState<string | null>(null);
  const [detailMode, setDetailMode] = useState<"view" | "edit">("view");
  const [panelForm, setPanelForm] = useState<FormState>(INITIAL_FORM);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [embedCopyBusy, setEmbedCopyBusy] = useState(false);
  const [embedCopyHint, setEmbedCopyHint] = useState<string | null>(null);
  const [manualEmbedUrl, setManualEmbedUrl] = useState<string | null>(null);
  const [isUnlockHolding, setIsUnlockHolding] = useState(false);
  const [unlockingAchievementId, setUnlockingAchievementId] = useState<string | null>(null);
  const [optimisticUnlockedAchievementId, setOptimisticUnlockedAchievementId] = useState<string | null>(null);
  const [unlockRevealProgress, setUnlockRevealProgress] = useState(0);

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
  const unlockAudioRef = useRef<HTMLAudioElement | null>(null);
  const unlockAudioPreparedRef = useRef<HTMLAudioElement | null>(null);
  const unlockSfxContextRef = useRef<AudioContext | null>(null);
  const unlockEaseOutBufferRef = useRef<AudioBuffer | null>(null);
  const unlockEaseOutSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const savePopPreparedRef = useRef<HTMLAudioElement | null>(null);
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

  function rollbackBadgeSession(ref: RefObject<BadgeIkSession>) {
    const r = ref.current;
    const last = r.lastSessionFileId?.trim() ?? "";
    const baseline = r.baselineFileId.trim();
    if (last && last !== baseline) {
      void deleteImageKitFile(last).catch(() => undefined);
    }
    r.lastSessionFileId = null;
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
    if (typeof performance !== "undefined" && Number.isFinite(performance.now())) {
      detailOpenStartedAtRef.current = performance.now();
    } else {
      detailOpenStartedAtRef.current = Date.now();
    }
    detailPerfMeasuredForIdRef.current = achievementId;
    detailImageDecodedMsRef.current = null;
    setDetailOpenToImageDecodedMs(null);
    setDetailOpenToVisualReadyMs(null);
  }, []);

  const handleDetailBadgeImageDecoded = useCallback(() => {
    if (!detailAchievement?.id) return;
    if (detailPerfMeasuredForIdRef.current !== detailAchievement.id) return;
    if (detailOpenStartedAtRef.current == null) return;
    const now =
      typeof performance !== "undefined" && Number.isFinite(performance.now())
        ? performance.now()
        : Date.now();
    const elapsed = Math.max(0, Math.round(now - detailOpenStartedAtRef.current));
    detailImageDecodedMsRef.current = elapsed;
    setDetailOpenToImageDecodedMs(elapsed);
  }, [detailAchievement?.id]);

  const handleDetailBadgeVisualReady = useCallback(() => {
    if (!detailAchievement?.id) return;
    if (detailPerfMeasuredForIdRef.current !== detailAchievement.id) return;
    if (detailOpenStartedAtRef.current == null) return;
    const now =
      typeof performance !== "undefined" && Number.isFinite(performance.now())
        ? performance.now()
        : Date.now();
    const elapsed = Math.max(0, Math.round(now - detailOpenStartedAtRef.current));
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
      const now =
        typeof performance !== "undefined" && Number.isFinite(performance.now())
          ? performance.now()
          : Date.now();
      const elapsed = Math.max(0, Math.round(now - detailOpenStartedAtRef.current));
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
      const res = await fetch("/api/embed/badge-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ achievementId: detailAchievement.id }),
      });
      const data = (await res.json()) as { embedUrl?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not create embed link.");
      if (!data.embedUrl) throw new Error("Missing embed URL.");
      embedUrlForFallback = data.embedUrl;
      const copied = await copyTextToClipboard(data.embedUrl);
      if (!copied) {
        setManualEmbedUrl(data.embedUrl);
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
  const detailMaskStyle = useMemo(() => {
    const src = detailAchievement?.icon_url?.trim() ?? "";
    return src ? getAlphaMaskStyle(src) : null;
  }, [detailAchievement?.icon_url]);
  const detailRenderSrc = useMemo(() => {
    const src = detailAchievement?.icon_url?.trim() ?? "";
    if (!src) return "";
    return badgeRenderOptimized ? toOptimizedBadgeRenderSrc(src) : src;
  }, [badgeRenderOptimized, detailAchievement?.icon_url]);
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
    const src = detailAchievement?.icon_url?.trim() ?? "";
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
  }, [badgeRenderOptimized, detailAchievement?.icon_url, detailIsLockedUi, readOnly]);

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

  useEffect(() => {
    if (!achievementOverlayOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [achievementOverlayOpen]);

  function closeDetailPanel() {
    if (isCreating) {
      rollbackBadgeSession(createBadgeIkSessionRef);
      setCreateForm({
        ...INITIAL_FORM,
        achievedAt: todayDateString(),
      });
      setIsCreating(false);
    }
    if (detailMode === "edit" && detailAchievement) {
      rollbackBadgeSession(panelBadgeIkSessionRef);
      setPanelForm(achievementToForm(detailAchievement));
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

  const stopUnlockSound = useCallback(() => {
    const audio = unlockAudioRef.current;
    unlockAudioRef.current = null;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
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

  function playUnlockTimelineSound() {
    if (typeof window === "undefined") return;
    try {
      stopUnlockSound();
      const audio =
        unlockAudioPreparedRef.current ?? new Audio(UNLOCK_PEEL_AUDIO_SRC);
      audio.preload = "auto";
      audio.currentTime = 0;
      audio.volume = 1;
      unlockAudioRef.current = audio;
      void audio.play().catch(() => {
        // ignore blocked autoplay / unavailable media
      });
    } catch {
      // ignore unsupported / blocked audio
    }
  }

  function playUnlockEaseOutSound() {
    if (typeof window === "undefined") return;
    const Ctor =
      window.AudioContext ||
      (
        window as unknown as {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;
    if (!Ctor) return;

    const ctx =
      unlockSfxContextRef.current ?? new Ctor();
    unlockSfxContextRef.current = ctx;

    const playWithBuffer = (buffer: AudioBuffer) => {
      try {
        unlockEaseOutSourceRef.current?.stop();
      } catch {
        // ignore
      }
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      gain.gain.value = 1;
      source.buffer = buffer;
      source.connect(gain);
      gain.connect(ctx.destination);
      source.onended = () => {
        if (unlockEaseOutSourceRef.current === source) {
          unlockEaseOutSourceRef.current = null;
        }
      };
      unlockEaseOutSourceRef.current = source;
      source.start(0);
    };

    const run = async () => {
      if (ctx.state !== "running") {
        await ctx.resume();
      }
      if (!unlockEaseOutBufferRef.current) {
        const response = await fetch(UNLOCK_EASE_OUT_AUDIO_SRC, { cache: "force-cache" });
        const arr = await response.arrayBuffer();
        unlockEaseOutBufferRef.current = await ctx.decodeAudioData(arr);
      }
      if (unlockEaseOutBufferRef.current) {
        playWithBuffer(unlockEaseOutBufferRef.current);
      }
    };

    void run().catch(() => {
      // Intentionally no fallback: this cue must come from its own audio asset.
    });
  }

  function primeUnlockAudioGestureContext() {
    if (typeof window === "undefined") return;
    try {
      const Ctor =
        window.AudioContext ||
        (
          window as unknown as {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;
      if (!Ctor) return;
      const ctx = unlockSfxContextRef.current ?? new Ctor();
      unlockSfxContextRef.current = ctx;
      void ctx.resume();
      if (!unlockEaseOutBufferRef.current) {
        void fetch(UNLOCK_EASE_OUT_AUDIO_SRC, { cache: "force-cache" })
          .then((res) => res.arrayBuffer())
          .then((arr) => ctx.decodeAudioData(arr))
          .then((buffer) => {
            unlockEaseOutBufferRef.current = buffer;
          })
          .catch(() => {
            // keep silent, retry on play
          });
      }
    } catch {
      // no-op
    }
  }

  useEffect(() => {
    // Preload once to avoid first-play lag on deployed environments.
    const peel = new Audio(UNLOCK_PEEL_AUDIO_SRC);
    peel.preload = "auto";
    peel.load();
    unlockAudioPreparedRef.current = peel;

    const savePop = new Audio(SAVE_POP_AUDIO_SRC);
    savePop.preload = "auto";
    savePop.load();
    savePopPreparedRef.current = savePop;

    return () => {
      if (unlockHoldTimeoutRef.current !== null) {
        window.clearTimeout(unlockHoldTimeoutRef.current);
      }
      interruptUnlockReveal();
      stopUnlockSound();
      unlockAudioPreparedRef.current = null;
      savePopPreparedRef.current?.pause();
      savePopPreparedRef.current = null;
      unlockEaseOutBufferRef.current = null;
      try {
        unlockEaseOutSourceRef.current?.stop();
      } catch {
        // ignore
      }
      unlockEaseOutSourceRef.current = null;
      unlockSfxContextRef.current?.close().catch(() => undefined);
      unlockSfxContextRef.current = null;
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

    const { data, error } = await supabase
      .from("achievements")
      .select(SELECT_COLUMNS)
      .eq("user_id", ownerUserId)
      .order("achieved_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setAchievements([]);
      setIsLoading(false);
      return;
    }

    const rawRows = Array.isArray(data) ? data : [];
    setAchievements(
      sortAchievements(
        rawRows.map((row) => normalizeAchievement(row as unknown as Record<string, unknown>)),
      ),
    );
    setIsLoading(false);
  }, [supabase, ownerUserId]);

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

    const insertPayload: AchievementInsertPayload = formToPayload(createForm);

    const { data, error } = await supabase
      .from("achievements")
      .insert(insertPayload)
      .select(SELECT_COLUMNS)
      .single();

    if (error) {
      setError(error.message);
      setIsSaving(false);
      return;
    }
    if (!data || typeof data === "string") {
      setError("Unexpected response while creating achievement.");
      setIsSaving(false);
      return;
    }

    const normalized = normalizeAchievement(data as unknown as Record<string, unknown>);
    const createdSrc = normalized.icon_url?.trim() ?? "";
    if (badgeRenderOptimized && createdSrc) {
      const renderSrc = toOptimizedBadgeRenderSrc(createdSrc);
      prewarmBadgeRenderCache(createdSrc, {
        motionSeed: normalized.id,
        includeAlphaMaskData: Boolean(normalized.is_locked) && !readOnly,
      });
      prewarmBadgeRenderCache(renderSrc, { motionSeed: normalized.id });
    }
    playSavePop();
    setAchievements((prev) => sortAchievements([normalized, ...prev]));
    setCreateForm({ ...INITIAL_FORM, achievedAt: todayDateString() });
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

    const updatePayload: AchievementUpdatePayload = formToPayload(panelForm);

    const { data, error } = await supabase
      .from("achievements")
      .update(updatePayload)
      .eq("id", detailAchievementId)
      .select(SELECT_COLUMNS)
      .single();

    if (error) {
      setError(error.message);
      setIsSaving(false);
      return;
    }
    if (!data || typeof data === "string") {
      setError("Unexpected response while updating achievement.");
      setIsSaving(false);
      return;
    }

    const normalized = normalizeAchievement(data as unknown as Record<string, unknown>);
    const previousSrc = detailAchievement?.icon_url?.trim() ?? "";
    const nextSrc = normalized.icon_url?.trim() ?? "";
    if (badgeRenderOptimized) {
      if (previousSrc && previousSrc !== nextSrc) {
        clearBadgeRenderCacheForSrc(previousSrc);
        clearBadgeRenderCacheForSrc(toOptimizedBadgeRenderSrc(previousSrc));
      }
      if (nextSrc) {
        const renderSrc = toOptimizedBadgeRenderSrc(nextSrc);
        prewarmBadgeRenderCache(nextSrc, {
          motionSeed: normalized.id,
          includeAlphaMaskData: Boolean(normalized.is_locked) && !readOnly,
        });
        prewarmBadgeRenderCache(renderSrc, { motionSeed: normalized.id });
      }
    }
    playSavePop();

    const baselineId = panelBadgeIkSessionRef.current.baselineFileId.trim();
    const savedFileId = (normalized.icon_file_id ?? "").trim();
    if (baselineId && baselineId !== savedFileId) {
      void deleteImageKitFile(baselineId).catch(() => undefined);
    }
    panelBadgeIkSessionRef.current = {
      baselineUrl: (normalized.icon_url ?? "").trim(),
      baselineFileId: savedFileId,
      lastSessionFileId: null,
    };

    setAchievements((prev) =>
      sortAchievements(
        prev.map((achievement) =>
          achievement.id === normalized.id ? normalized : achievement,
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
    const ikId = target?.icon_file_id?.trim();
    const targetSrc = target?.icon_url?.trim() ?? "";
    if (ikId) {
      try {
        await deleteImageKitFile(ikId);
      } catch (e) {
        console.warn("ImageKit delete on achievement remove", e);
      }
    }

    const { error } = await supabase.from("achievements").delete().eq("id", id);

    if (error) {
      setError(error.message);
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

    const { data, error } = await supabase
      .from("achievements")
      .update({ is_locked: false })
      .eq("id", targetId)
      .select(SELECT_COLUMNS)
      .single();

    if (error || !data || typeof data === "string") {
      setError(error?.message ?? "Unexpected response while unlocking achievement.");
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

    const normalized = normalizeAchievement(data as unknown as Record<string, unknown>);
    setAchievements((prev) =>
      sortAchievements(
        prev.map((achievement) =>
          achievement.id === normalized.id ? normalized : achievement,
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
    playUnlockTimelineSound();
    unlockHoldTimeoutRef.current = window.setTimeout(() => {
      unlockHoldTimeoutRef.current = null;
      setIsUnlockHolding(false);
      void handlePressHoldUnlock();
    }, UNLOCK_HOLD_DURATION_MS);
  }

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      {isLoading ? (
        <div className="space-y-4">
          <AchievementGridLoadingSkeleton />
        </div>
      ) : (
        <div className="space-y-4">
          <div
            className={cn(
              "-mx-2 min-h-[200px] rounded-none bg-background px-2 py-6",
              "sm:mx-0 sm:rounded-2xl sm:px-4",
            )}
          >
            <div className="grid grid-cols-3 gap-x-2 gap-y-8">
              {!readOnly ? (
                <button
                  type="button"
                  className={cn(
                    "no-tap-highlight group flex w-full flex-col items-center gap-1.5 px-0.5 py-1 text-center outline-none transition-opacity",
                    "text-white/45 hover:text-white/80",
                    "focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  )}
                  onClick={() => {
                    createBadgeIkSessionRef.current = createEmptyBadgeIkSession();
                    setIsCreating(true);
                    setDetailAchievementId(null);
                    setDetailMode("edit");
                    setCreateForm({
                      ...INITIAL_FORM,
                      achievedAt: todayDateString(),
                    });
                  }}
                >
                  <div
                    className={cn(
                      "relative flex aspect-square w-full max-w-[104px] items-center justify-center rounded-3xl",
                      "border border-dashed border-white/25 bg-transparent transition-colors",
                      "group-hover:border-white/45 group-hover:bg-white/[0.04]",
                    )}
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-current/40">
                      <Sparkles className="h-6 w-6" />
                    </div>
                  </div>
                  <p className="line-clamp-2 h-[2.7em] max-h-[2.7em] w-full shrink-0 overflow-hidden text-[11px] font-medium leading-[1.35] text-white/55 group-hover:text-white/80 sm:text-xs">
                    Add achievement
                  </p>
                  <p className="text-[10px] text-white/35 sm:text-[11px]">—</p>
                </button>
              ) : null}

              {achievements.map((achievement) => {
                return (
                  <AchievementGridItem
                    key={achievement.id}
                    title={achievement.title}
                    dateLabel={formatGridDate(achievement.achieved_at)}
                    iconUrl={achievement.icon_url}
                    FallbackIcon={getSafeIcon(achievement.icon)}
                    tone={resolveTone(achievement)}
                    isLocked={Boolean(achievement.is_locked)}
                    onClick={() => {
                      markDetailOpenStart(achievement.id);
                      setDetailAchievementId(achievement.id);
                      setDetailMode("view");
                      setIsCreating(false);
                    }}
                  />
                );
              })}
            </div>

            {achievements.length === 0 ? (
              <p className="mt-6 text-center text-sm text-white/45">
                {readOnly
                  ? "No achievements to show yet."
                  : "No achievements yet. Tap Add achievement to create one."}
              </p>
            ) : null}
          </div>
        </div>
      )}

      {detailAchievement || isCreating
        ? typeof document !== "undefined"
          ? createPortal(
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="achievement-detail-title"
                className="fixed inset-0 z-[200] flex min-h-0 w-full min-w-0 flex-col overscroll-contain min-h-screen min-h-[100dvh]"
              >
                {/* Edge-to-edge dimmer (absolute so it always fills the fixed shell; no padding) */}
                <div
                  aria-hidden
                  className="absolute inset-0 z-0 bg-black/[65.5%] backdrop-blur-sm"
                  onClick={() => closeDetailPanel()}
                />
                {/* Scroll + center sheet; safe-area padding only here */}
                <div
                  className="relative z-10 flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-6"
                  onClick={() => closeDetailPanel()}
                >
                  <div
                    className={cn(
                      "relative mx-auto my-auto flex w-full max-w-lg max-h-[min(92dvh,56rem)] min-h-0 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain rounded-3xl border border-white/12 bg-card p-4 pb-6 text-card-foreground sm:p-6 sm:pb-6",
                      "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12),inset_0_1px_0_0_rgba(255,255,255,0.08),inset_0_-1px_0_0_rgba(0,0,0,0.12),inset_1px_0_0_0_rgba(255,255,255,0.05),inset_-1px_0_0_0_rgba(255,255,255,0.05),inset_0_0_12px_rgba(0,0,0,0.1),0_4px_14px_-3px_rgba(0,0,0,0.24),0_16px_44px_-12px_rgba(0,0,0,0.32)]",
                      "outline-none focus-visible:outline-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
                      (isCreating || detailMode === "edit") &&
                        "overflow-x-hidden",
                    )}
                    onClick={(e) => e.stopPropagation()}
                  >
            {isCreating ? (
              <EditableAchievementCard
                form={createForm}
                setForm={setCreateForm}
                isSaving={isSaving}
                onSubmit={handleCreate}
                onCancel={() => {
                  rollbackBadgeSession(createBadgeIkSessionRef);
                  setCreateForm({
                    ...INITIAL_FORM,
                    achievedAt: todayDateString(),
                  });
                  setIsCreating(false);
                  setDetailMode("view");
                }}
                badgeIkSessionRef={createBadgeIkSessionRef}
                baselineIconFileId={createBadgeIkSessionRef.current.baselineFileId}
                onClosePanel={() => closeDetailPanel()}
              />
            ) : detailMode === "view" && detailAchievement ? (
              <div className="no-tap-highlight flex w-full flex-col items-center pt-1">
                <div className={achievementBadgeChromeWidth}>
                  <div
                    className={cn(
                      "flex w-full items-center justify-end pb-1",
                      achievementDialogChromeInset,
                    )}
                  >
                    <button
                      type="button"
                      aria-label="Close"
                      className={achievementDialogIconBtn}
                      onClick={() => closeDetailPanel()}
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                  <div className="flex justify-center">
                    <AchievementBadgeSlot
                      size="detail"
                    >
                      {detailIsLockedUi && !readOnly ? (
                        <button
                          type="button"
                          aria-label="Press and hold to unlock"
                          className={cn(
                            "no-tap-highlight absolute inset-0 z-20",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                            isUnlockHolding && "ring-2 ring-white/40",
                          )}
                          style={detailMaskStyle ?? undefined}
                          onPointerDown={(e) => {
                            if (
                              !isOpaqueBadgeHit(
                                e.clientX,
                                e.clientY,
                                e.currentTarget.getBoundingClientRect(),
                                unlockAlphaMaskRef.current,
                              )
                            ) {
                              return;
                            }
                            startUnlockHold();
                          }}
                          onPointerUp={cancelUnlockHold}
                          onPointerLeave={cancelUnlockHold}
                          onPointerCancel={cancelUnlockHold}
                          onContextMenu={(e) => e.preventDefault()}
                        />
                      ) : null}
                      {detailAchievement.icon_url?.trim() ? (
                        <>
                          <div className="relative h-full w-full">
                            <AchievementBadge3DViewer
                              src={detailRenderSrc}
                              className="p-1"
                              interactive
                              float={detailFloating}
                              motionSeed={detailAchievement.id}
                              motionStartCentered={
                                optimisticUnlockedAchievementId === detailAchievement.id
                              }
                              optimized={badgeRenderOptimized}
                              onImageDecoded={handleDetailBadgeImageDecoded}
                              onVisualReady={handleDetailBadgeVisualReady}
                            />
                          </div>
                          {detailIsLockedUi ? (
                            <div className="absolute inset-0">
                              <RemoteBadgeImage
                                src={detailAchievement.icon_url.trim()}
                                className={cn(
                                  "p-1 h-full w-full object-contain opacity-80 grayscale",
                                  detailIsUnlocking && "opacity-90",
                                )}
                              />
                            </div>
                          ) : null}
                          {detailIsUnlocking ? (
                            <>
                              <div
                                className="absolute inset-0"
                                style={{
                                  ...(detailMaskStyle ?? {}),
                                  clipPath: unlockRevealClipPath,
                                }}
                              >
                                <RemoteBadgeImage
                                  src={detailAchievement.icon_url.trim()}
                                  className="p-1 h-full w-full object-contain"
                                />
                              </div>
                            </>
                          ) : null}
                        </>
                      ) : (
                        <>
                          <AchievementFallbackBadge
                            tone={detailTone}
                            isLocked={detailIsLockedUi}
                            FallbackIcon={DetailFallbackIcon}
                            size="detail"
                          />
                          {detailIsUnlocking ? (
                            <>
                              <div
                                className="absolute inset-0"
                                style={{
                                  ...(detailMaskStyle ?? {}),
                                  clipPath: unlockRevealClipPath,
                                }}
                              >
                                <AchievementFallbackBadge
                                  tone={detailTone}
                                  isLocked={false}
                                  FallbackIcon={DetailFallbackIcon}
                                  size="detail"
                                />
                              </div>
                            </>
                          ) : null}
                        </>
                      )}
                    </AchievementBadgeSlot>
                  </div>
                </div>

                <p className="mt-8 w-full text-center text-[11px] font-medium uppercase tracking-[0.2em] text-white/45">
                  {(detailAchievement.category?.trim() ||
                    (detailIsLockedUi ? "Locked" : "Uncategorized"))}
                </p>
                <h2
                  id="achievement-detail-title"
                  className="mt-2 text-center text-xl font-semibold tracking-tight text-white"
                >
                  {detailAchievement.title?.trim() ||
                    (detailIsLockedUi ? "Locked" : "Untitled")}
                </h2>
                <p className="mt-4 break-words text-center text-sm leading-relaxed text-white/65">
                  {detailIsLockedUi
                    ? detailAchievement.description?.trim() ||
                      "This achievement is locked."
                    : detailAchievement.description?.trim() || "No description yet."}
                </p>
                {formatAchievedAt(detailAchievement.achieved_at) ? (
                  <p className="mt-4 text-center text-xs text-white/40">
                    {formatAchievedAt(detailAchievement.achieved_at)}
                  </p>
                ) : null}

                {!readOnly ? (
                  <div
                    className={cn(
                      achievementBadgeChromeWidth,
                      achievementDialogChromeInset,
                      "mt-3 flex min-h-10 flex-col items-stretch gap-2",
                      !formatAchievedAt(detailAchievement.achieved_at) && "mt-6",
                    )}
                  >
                    <div className="flex min-h-10 items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label="Edit"
                          className={achievementDialogIconBtn}
                          disabled={isSaving}
                          onClick={() => {
                            panelBadgeIkSessionRef.current = {
                              baselineUrl: detailAchievement.icon_url ?? "",
                              baselineFileId: detailAchievement.icon_file_id ?? "",
                              lastSessionFileId: null,
                            };
                            setPanelForm(achievementToForm(detailAchievement));
                            setDetailMode("edit");
                          }}
                        >
                          <PenLine className="h-4 w-4" aria-hidden />
                        </button>
                        {detailAchievement.icon_url?.trim() ? (
                          <button
                            type="button"
                            aria-label="Copy embed link"
                            className={achievementDialogIconBtn}
                            disabled={isSaving || embedCopyBusy}
                            onClick={() => void copyEmbedLink()}
                          >
                            <Link2 className="h-4 w-4" aria-hidden />
                          </button>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        aria-label="Delete"
                        className={achievementDialogIconBtn}
                        disabled={isSaving}
                        onClick={() => setDeleteConfirmId(detailAchievement.id)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                    {embedCopyHint ? (
                      <p className="text-center text-xs text-white/50" role="status">
                        {embedCopyHint}
                      </p>
                    ) : null}
                  </div>
                ) : formatAchievedAt(detailAchievement.achieved_at) ? null : (
                  <div className="mt-6" aria-hidden />
                )}
              </div>
            ) : detailAchievement ? (
              <EditableAchievementCard
                form={panelForm}
                setForm={setPanelForm}
                isSaving={isSaving}
                onSubmit={handlePanelSave}
                onCancel={() => {
                  rollbackBadgeSession(panelBadgeIkSessionRef);
                  if (detailAchievement) {
                    setPanelForm(achievementToForm(detailAchievement));
                  }
                  setDetailMode("view");
                }}
                badgeIkSessionRef={panelBadgeIkSessionRef}
                baselineIconFileId={
                  panelBadgeIkSessionRef.current.baselineFileId
                }
                onClosePanel={() => closeDetailPanel()}
                showBackArrow
              />
            ) : null}
                  </div>
                </div>
              </div>,
              document.body,
            )
        : null
      : null}

      {deleteConfirmId ? (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-achievement-title"
          className="fixed inset-0 z-[220] flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm"
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-transparent bg-background p-6 shadow-none"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="delete-achievement-title"
              className="text-lg font-semibold tracking-tight"
            >
              Delete achievement?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This cannot be undone. The achievement will be removed and any
              custom badge image stored on ImageKit will be deleted when possible.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDeleteConfirmId(null)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => void handleDelete(deleteConfirmId)}
                disabled={isSaving}
              >
                {isSaving ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {manualEmbedUrl ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="manual-copy-title"
          className="fixed inset-0 z-[230] flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm"
          onClick={() => setManualEmbedUrl(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#12101a] p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="manual-copy-title" className="text-base font-semibold text-white">
              Copy embed link
            </h2>
            <div className="relative mt-3">
              <input
                readOnly
                value={manualEmbedUrl}
                className="h-10 w-full overflow-hidden rounded-md border border-white/15 bg-black/25 pl-3 pr-11 text-xs text-white/85"
                onFocus={(e) => e.currentTarget.select()}
              />
              <button
                type="button"
                aria-label="Copy embed link"
                className="absolute right-1 top-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-white/75 transition hover:bg-white/10 hover:text-white"
                onClick={() => {
                  void copyTextToClipboard(manualEmbedUrl);
                  setEmbedCopyHint("Embed link copied.");
                  setManualEmbedUrl(null);
                  window.setTimeout(() => setEmbedCopyHint(null), 2500);
                }}
              >
                <Copy className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button type="button" onClick={() => setManualEmbedUrl(null)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {badgeDebugOverlay ? (
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
            {detailOpenToVisualReadyMs == null ||
            detailOpenToImageDecodedMs == null
              ? " -"
              : ` ${Math.max(0, detailOpenToVisualReadyMs - detailOpenToImageDecodedMs)}ms`}
          </span>
          <span className="ml-2 text-white/65">
            open→visual:
            {detailOpenToVisualReadyMs == null ? " -" : ` ${detailOpenToVisualReadyMs}ms`}
          </span>
        </div>
      ) : null}
    </div>
  );
  
  function playSavePop() {
    if (typeof window === "undefined") return;
    try {
      const audio = savePopPreparedRef.current ?? new Audio(SAVE_POP_AUDIO_SRC);
      audio.preload = "auto";
      audio.currentTime = 0;
      audio.volume = 1;
      savePopPreparedRef.current = audio;
      void audio.play().catch(() => {
        // ignore blocked autoplay / unavailable media
      });
    } catch {
      // ignore unsupported / blocked audio
    }
  }
}
