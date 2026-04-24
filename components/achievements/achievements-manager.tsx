"use client";

import { createPortal } from "react-dom";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from "react";
import { Sparkles, X } from "lucide-react";

import { type AchievementTone } from "@/components/achievements/achievement-card";
import { AchievementBadgeSlot } from "@/components/achievements/achievement-badge-slot";
import { AchievementFallbackBadge } from "@/components/achievements/achievement-fallback-badge";
import { AchievementGridItem } from "@/components/achievements/achievement-grid-item";
import {
  type AchievementIconKey,
  type BadgeIkSession,
  EMPTY_BADGE_IK_SESSION,
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
  tone: "gold",
  isLocked: false,
  achievedAt: todayDateString(),
};

const SELECT_COLUMNS =
  "id,title,description,category,icon,icon_url,icon_file_id,tone,is_locked,achieved_at,created_at";

function normalizeAchievement(row: Record<string, unknown>): AchievementRecord {
  return {
    id: String(row.id),
    title: (row.title as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    category: (row.category as string | null) ?? null,
    icon: getSafeIconKey(row.icon as string | null | undefined),
    icon_url: (row.icon_url as string | null) ?? null,
    icon_file_id: (row.icon_file_id as string | null) ?? null,
    tone: row.tone as AchievementTone,
    is_locked: Boolean(row.is_locked),
    achieved_at: (row.achieved_at as string | null) ?? null,
    created_at: String(row.created_at),
  };
}

function resolveTone(achievement: AchievementRecord | null) {
  return achievement?.tone ?? "gold";
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

export function AchievementsManager() {
  const supabase = useMemo(() => createClient(), []);
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

  const createBadgeIkSessionRef = useRef<BadgeIkSession>(EMPTY_BADGE_IK_SESSION);
  const panelBadgeIkSessionRef = useRef<BadgeIkSession>(EMPTY_BADGE_IK_SESSION);

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

  const DetailFallbackIcon = getSafeIcon(detailAchievement?.icon);
  const detailTone: AchievementTone = useMemo(
    () => resolveTone(detailAchievement),
    [detailAchievement]
  );

  useEffect(() => {
    void loadAchievements();
  }, []);

  useEffect(() => {
    if (
      detailAchievementId &&
      !achievements.some((a) => a.id === detailAchievementId)
    ) {
      setDetailAchievementId(null);
      setDetailMode("view");
    }
  }, [achievements, detailAchievementId]);

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
  }

  async function loadAchievements() {
    setIsLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("achievements")
      .select(SELECT_COLUMNS)
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
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
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
    tryPlayUnlockSaveChime(normalized);
    setAchievements((prev) => sortAchievements([normalized, ...prev]));
    setCreateForm({ ...INITIAL_FORM, achievedAt: todayDateString() });
    createBadgeIkSessionRef.current = EMPTY_BADGE_IK_SESSION;
    setIsSaving(false);
    setIsCreating(false);
    setDetailAchievementId(null);
    setDetailMode("view");
  }

  async function handlePanelSave(e: FormEvent) {
    e.preventDefault();
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
    tryPlayUnlockSaveChime(normalized);

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
    setIsSaving(true);
    setError(null);

    const target = achievements.find((a) => a.id === id);
    const ikId = target?.icon_file_id?.trim();
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
    if (detailAchievementId === id) {
      setDetailAchievementId(null);
      setDetailMode("view");
    }
    setDeleteConfirmId(null);
    setIsSaving(false);
  }

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading achievements...</p>
      ) : (
        <div className="space-y-4">
          <div
            className={cn(
              "-mx-2 min-h-[200px] rounded-none bg-neutral-950 px-2 py-6",
              "sm:mx-0 sm:rounded-2xl sm:px-4",
            )}
          >
            <div className="grid grid-cols-3 gap-x-2 gap-y-8">
              <button
                type="button"
                className={cn(
                  "group flex w-full flex-col items-center gap-1.5 px-0.5 py-1 text-center outline-none transition-opacity",
                  "text-white/45 hover:text-white/80",
                  "focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                )}
                onClick={() => {
                  createBadgeIkSessionRef.current = EMPTY_BADGE_IK_SESSION;
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
                No achievements yet. Tap Add achievement to create one.
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
                  className="absolute inset-0 z-0 bg-black/70 backdrop-blur-sm"
                  onClick={() => closeDetailPanel()}
                />
                {/* Scroll + center sheet; safe-area padding only here */}
                <div
                  className="relative z-10 flex min-h-0 w-full flex-1 items-center justify-center overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6"
                  onClick={() => closeDetailPanel()}
                >
                  <div
                    className={cn(
                      "relative mx-auto my-auto flex w-full max-w-lg max-h-[min(92dvh,56rem)] flex-col overflow-y-auto overscroll-y-contain rounded-2xl border border-white/10 bg-zinc-950 p-4 pb-6 shadow-2xl sm:p-6 sm:pb-6",
                      (isCreating || detailMode === "edit") &&
                        "overflow-x-hidden",
                    )}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex w-full shrink-0 justify-end pb-3">
                      <button
                        type="button"
                        aria-label="Close"
                        className="rounded-full border border-white/15 bg-white/5 p-2 text-white/80 transition hover:bg-white/10"
                        onClick={() => closeDetailPanel()}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

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
              />
            ) : detailMode === "view" && detailAchievement ? (
              <div className="flex w-full flex-col items-center">
                <AchievementBadgeSlot
                  size="overlay-xl"
                  className={cn(
                    Boolean(detailAchievement.is_locked) && "opacity-75 grayscale",
                  )}
                >
                  {detailAchievement.icon_url?.trim() ? (
                    <img
                      src={detailAchievement.icon_url.trim()}
                      alt=""
                      className="h-full w-full object-contain p-1 drop-shadow-lg"
                    />
                  ) : (
                    <AchievementFallbackBadge
                      tone={detailTone}
                      isLocked={Boolean(detailAchievement.is_locked)}
                      FallbackIcon={DetailFallbackIcon}
                      size="overlay-xl"
                    />
                  )}
                </AchievementBadgeSlot>

                <p className="mt-6 w-full text-center text-base font-medium uppercase tracking-[0.2em] text-white/45 sm:mt-8">
                  {(detailAchievement.category?.trim() ||
                    (detailAchievement.is_locked ? "Locked" : "Uncategorized"))}
                </p>
                <h2
                  id="achievement-detail-title"
                  className="mt-1.5 text-center text-xl font-semibold tracking-tight text-white"
                >
                  {detailAchievement.title?.trim() ||
                    (detailAchievement.is_locked ? "Locked" : "Untitled")}
                </h2>
                <p className="mt-2 break-words text-center text-base leading-relaxed text-white/65 sm:mt-3">
                  {detailAchievement.is_locked
                    ? detailAchievement.description?.trim() ||
                      "This achievement is locked."
                    : detailAchievement.description?.trim() || "No description yet."}
                </p>
                {formatAchievedAt(detailAchievement.achieved_at) ? (
                  <p className="mt-2 text-center text-base text-white/40 sm:mt-3">
                    {formatAchievedAt(detailAchievement.achieved_at)}
                  </p>
                ) : null}

                <div className="mt-6 flex flex-wrap justify-center gap-2 sm:mt-8">
                  <Button
                    type="button"
                    variant="secondary"
                    className="bg-white/10 text-white hover:bg-white/15"
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
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setDeleteConfirmId(detailAchievement.id)}
                    disabled={isSaving}
                  >
                    Delete
                  </Button>
                </div>
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
          className="fixed inset-0 z-[220] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-xl"
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
    </div>
  );
  
  // #region Save Sound Effects

  function tryPlayUnlockSaveChime(achievement: AchievementRecord) {
    if (!achievement.is_locked) {
      playUnlockSaveChime();
    }
  }
  
  /** Short pleasant chime when an achievement is saved unlocked (no audio files). */
  function playUnlockSaveChime() {
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
  
      const ctx = new Ctor();
      void ctx.resume?.();
  
      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.12, now);
      master.connect(ctx.destination);
  
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);
        const start = now + i * 0.06;
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(0.35, start + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
        osc.connect(g);
        g.connect(master);
        osc.start(start);
        osc.stop(start + 0.25);
      });
  
      const end = now + notes.length * 0.06 + 0.35;
      setTimeout(() => {
        void ctx.close?.();
      }, Math.ceil((end - now) * 1000) + 50);
    } catch {
      // ignore unsupported / blocked audio
    }
  }

  // #endregion
}
