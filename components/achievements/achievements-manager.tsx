"use client";

import { createPortal } from "react-dom";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
  type RefObject,
  type SetStateAction,
} from "react";
import {
  Award,
  BookOpen,
  Brain,
  Camera,
  Compass,
  Crown,
  Flag,
  Flame,
  Gem,
  Globe2,
  Heart,
  Leaf,
  Lock,
  Medal,
  Orbit,
  Palette,
  PenLine,
  Puzzle,
  Rocket,
  Shield,
  Sparkles,
  Star,
  Sunrise,
  Target,
  Trophy,
  Unlock,
  Waves,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";

import {
  achievementToneStyles,
  achievementToneSwatches,
  type AchievementTone,
} from "@/components/achievements/achievement-card";
import { AchievementBadgeSlot } from "@/components/achievements/achievement-badge-slot";
import { AchievementRoundBadgeEditor } from "@/components/achievements/achievement-round-badge-editor";
import { AchievementFallbackBadge } from "@/components/achievements/achievement-fallback-badge";
import { AchievementGridItem } from "@/components/achievements/achievement-grid-item";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { deleteImageKitFile } from "@/lib/imagekit-client";
import { cn } from "@/lib/utils";

type AchievementRecord = {
  id: string;
  title: string | null;
  description: string | null;
  category: string | null;
  icon: string | null;
  icon_url: string | null;
  icon_file_id: string | null;
  tone: AchievementTone | null;
  is_locked: boolean | null;
  achieved_at: string | null;
  created_at: string;
};

const BASE_SELECT_COLUMNS =
  "id,title,description,category,icon,achieved_at,created_at";

function buildSelectColumns(
  hasTone: boolean,
  hasLocked: boolean,
  hasIconUrl: boolean,
  hasIconFileId: boolean,
) {
  return `${BASE_SELECT_COLUMNS}${hasTone ? ",tone" : ""}${hasLocked ? ",is_locked" : ""}${hasIconUrl ? ",icon_url" : ""}${hasIconFileId ? ",icon_file_id" : ""}`;
}

function normalizeAchievement(row: Record<string, unknown>): AchievementRecord {
  return {
    id: String(row.id),
    title: (row.title as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    category: (row.category as string | null) ?? null,
    icon: (row.icon as string | null) ?? null,
    icon_url: (row.icon_url as string | null) ?? null,
    icon_file_id: (row.icon_file_id as string | null) ?? null,
    tone: (row.tone as AchievementTone | null) ?? null,
    is_locked: Boolean(row.is_locked),
    achieved_at: (row.achieved_at as string | null) ?? null,
    created_at: String(row.created_at),
  };
}

type AchievementIconKey =
  | "trophy"
  | "medal"
  | "star"
  | "sparkles"
  | "flame"
  | "award"
  | "rocket"
  | "shield"
  | "compass"
  | "globe"
  | "leaf"
  | "gem"
  | "zap"
  | "crown"
  | "brain"
  | "heart"
  | "target"
  | "book"
  | "camera"
  | "palette"
  | "orbit"
  | "puzzle"
  | "waves"
  | "sunrise"
  | "flag"
  | "pen";

const iconMap: Record<AchievementIconKey, LucideIcon> = {
  trophy: Trophy,
  medal: Medal,
  star: Star,
  sparkles: Sparkles,
  flame: Flame,
  award: Award,
  rocket: Rocket,
  shield: Shield,
  compass: Compass,
  globe: Globe2,
  leaf: Leaf,
  gem: Gem,
  zap: Zap,
  crown: Crown,
  brain: Brain,
  heart: Heart,
  target: Target,
  book: BookOpen,
  camera: Camera,
  palette: Palette,
  orbit: Orbit,
  puzzle: Puzzle,
  waves: Waves,
  sunrise: Sunrise,
  flag: Flag,
  pen: PenLine,
};

const toneByIcon: Record<AchievementIconKey, AchievementTone> = {
  trophy: "gold",
  medal: "sky",
  star: "violet",
  sparkles: "emerald",
  flame: "gold",
  award: "sky",
  rocket: "indigo",
  shield: "teal",
  compass: "violet",
  globe: "teal",
  leaf: "emerald",
  gem: "rose",
  zap: "sky",
  crown: "gold",
  brain: "indigo",
  heart: "rose",
  target: "orange",
  book: "teal",
  camera: "cyan",
  palette: "fuchsia",
  orbit: "violet",
  puzzle: "lime",
  waves: "cyan",
  sunrise: "orange",
  flag: "sky",
  pen: "teal",
};

function resolveTone(achievement: AchievementRecord | null) {
  if (!achievement) return "gold";
  return achievement.tone ?? toneByIcon[getSafeIconKey(achievement.icon)];
}

type FormState = {
  title: string;
  description: string;
  category: string;
  icon: AchievementIconKey;
  iconUrl: string;
  iconFileId: string;
  tone: AchievementTone;
  isLocked: boolean;
  achievedAt: string;
};

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

const initialForm: FormState = {
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

function formatGridDate(value: string | null) {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short" });
}

function formatAchievedAt(value: string | null) {
  if (!value) return undefined;
  const parsed = new Date(`${value}T00:00:00`);
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function toNullable(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getSafeIcon(achievement: AchievementRecord | null): LucideIcon {
  return iconMap[getSafeIconKey(achievement?.icon)];
}

function getSafeIconKey(value?: string | null): AchievementIconKey {
  if (value && value in iconMap)
    return value as AchievementIconKey;
  else return "trophy";
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

function hasMeaningfulContent(form: FormState) {
  return (
    form.title.trim().length > 0 ||
    form.description.trim().length > 0 ||
    form.category.trim().length > 0
  );
}

type BadgeIkSession = {
  baselineUrl: string;
  baselineFileId: string;
  lastSessionFileId: string | null;
};

function deletePreviousSessionUpload(ref: RefObject<BadgeIkSession>) {
  const s = ref.current;
  const prev = s.lastSessionFileId?.trim() ?? "";
  const baseline = s.baselineFileId.trim();
  if (prev && prev !== baseline) {
    void deleteImageKitFile(prev).catch(() => undefined);
  }
}

type EditorCardProps = {
  id: string;
  form: FormState;
  setForm: Dispatch<SetStateAction<FormState>>;
  submitLabel: string;
  isSaving: boolean;
  onSubmit: (e: FormEvent) => void;
  onCancel?: () => void;
  hasIconUrlColumn: boolean;
  hasIconFileIdColumn: boolean;
  /** ImageKit session for staged uploads (replace chain + cancel restore). */
  badgeIkSessionRef: RefObject<BadgeIkSession>;
  /** Saved ImageKit file id at session start (empty for create). */
  baselineIconFileId: string;
  /** Sheet edit matches close-up overlay; inline is the create card on the page. */
  appearance: "overlay" | "inline";
  toneMenuFor: string | null;
  setToneMenuFor: Dispatch<SetStateAction<string | null>>;
  iconMenuFor: string | null;
  setIconMenuFor: Dispatch<SetStateAction<string | null>>;
};

function EditableAchievementCard({
  id,
  form,
  setForm,
  submitLabel,
  isSaving,
  onSubmit,
  onCancel,
  hasIconUrlColumn,
  hasIconFileIdColumn,
  badgeIkSessionRef,
  baselineIconFileId,
  appearance,
  toneMenuFor,
  setToneMenuFor,
  iconMenuFor,
  setIconMenuFor,
}: EditorCardProps) {
  const tonePickerRef = useRef<HTMLDivElement>(null);
  const iconPickerRef = useRef<HTMLDivElement>(null);
  const Icon = iconMap[form.icon];
  const toneMenuOpen = toneMenuFor === id;
  const iconMenuOpen = iconMenuFor === id;
  const isOverlay = appearance === "overlay";

  function resizeTextarea(target: HTMLTextAreaElement) {
    target.style.height = "0px";
    target.style.height = `${target.scrollHeight}px`;
  }

  const fieldMuted = isOverlay ? "text-white/45" : "text-muted-foreground";
  const fieldBody = isOverlay ? "text-white/70" : "text-foreground/90";
  const fieldTitle = isOverlay ? "text-white" : "text-foreground";
  const chipBtn = isOverlay
    ? "border-white/25 bg-white/10 text-white hover:bg-white/15"
    : "border-white/30 bg-white/40 text-foreground/80 backdrop-blur-sm dark:bg-white/10";

  useEffect(() => {
    if (!toneMenuOpen && !iconMenuOpen) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      const toneEl = tonePickerRef.current;
      const iconEl = iconPickerRef.current;
      const inTone = toneEl ? toneEl.contains(target) : false;
      const inIcon = iconEl ? iconEl.contains(target) : false;
      if (!inTone && !inIcon) {
        setToneMenuFor(null);
        setIconMenuFor(null);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [iconMenuOpen, setIconMenuFor, setToneMenuFor, toneMenuOpen]);

  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        "relative flex flex-col items-center text-center",
        isOverlay
          ? "pt-2 text-white"
          : cn(
              "overflow-visible rounded-3xl border bg-card/90 p-6 shadow-sm",
              "bg-gradient-to-br",
              achievementToneStyles[form.tone],
            ),
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl",
          isOverlay ? "bg-white/12" : "bg-white/20",
        )}
      />

      <div className="relative z-20 flex h-11 flex-wrap items-center justify-center gap-2">
        <div ref={tonePickerRef} className="relative flex h-11 items-center">
          <button
            type="button"
            aria-label="Select tone"
            className={cn(
              "h-11 w-11 shrink-0 rounded-full border shadow-sm",
              achievementToneSwatches[form.tone],
              isOverlay ? "border-white/50" : "border-white/70",
            )}
            onClick={() => {
              setToneMenuFor(toneMenuOpen ? null : id);
              setIconMenuFor(null);
            }}
          />
          {toneMenuOpen ? (
            <div className="absolute left-1/2 top-9 z-40 flex -translate-x-1/2 gap-2 rounded-full border bg-background/95 p-2 shadow-lg backdrop-blur-sm">
              {(Object.keys(achievementToneSwatches) as AchievementTone[]).map((tone) => (
                <button
                  key={tone}
                  type="button"
                  aria-label={`Set tone ${tone}`}
                  className={cn(
                    "h-8 w-8 rounded-full border transition-transform",
                    achievementToneSwatches[tone],
                    form.tone === tone ? "scale-110 border-foreground" : "border-white/60",
                  )}
                  onClick={() => {
                    setForm((prev) => ({ ...prev, tone }));
                  }}
                />
              ))}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          aria-label={form.isLocked ? "Set unlocked" : "Set locked"}
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border shadow-sm",
            chipBtn,
          )}
          onClick={() =>
            setForm((prev) => ({
              ...prev,
              isLocked: !prev.isLocked,
            }))
          }
        >
          {form.isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
        </button>
      </div>

      {hasIconUrlColumn ? (
        <div className={cn(isOverlay ? "mt-8" : "mt-5")}>
          <AchievementRoundBadgeEditor
            instanceId={id}
            imageUrl={form.iconUrl}
            iconFileId={hasIconFileIdColumn ? form.iconFileId : ""}
            baselineIconFileId={baselineIconFileId}
            tone={form.tone}
            isLocked={form.isLocked}
            FallbackIcon={Icon}
            onRemoteUploadCommit={(url, fileId) => {
              deletePreviousSessionUpload(badgeIkSessionRef);
              badgeIkSessionRef.current = {
                ...badgeIkSessionRef.current,
                lastSessionFileId: fileId.trim() || null,
              };
              setForm((prev) => ({
                ...prev,
                iconUrl: url,
                iconFileId: fileId,
              }));
            }}
            onImageUrlChange={(url) =>
              setForm((prev) => ({ ...prev, iconUrl: url }))
            }
            onIconFileIdChange={(fid) =>
              setForm((prev) => ({ ...prev, iconFileId: fid }))
            }
            onStagedUploadCleared={() => {
              badgeIkSessionRef.current.lastSessionFileId = null;
            }}
            menuAccessory={
              <div ref={iconPickerRef} className="relative flex h-11 items-center">
                <button
                  type="button"
                  aria-label="Select icon"
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-full border shadow-sm",
                    chipBtn,
                  )}
                  onClick={() => {
                    setIconMenuFor(iconMenuOpen ? null : id);
                    setToneMenuFor(null);
                  }}
                >
                  <Icon className="h-4 w-4" />
                </button>
                {iconMenuOpen ? (
                  <div className="absolute left-1/2 top-12 z-40 grid w-64 -translate-x-1/2 grid-cols-6 gap-2 rounded-2xl border bg-background/95 p-2 shadow-lg backdrop-blur-sm">
                    {(Object.keys(iconMap) as AchievementIconKey[]).map((iconKey) => {
                      const OptionIcon = iconMap[iconKey];
                      return (
                        <button
                          key={iconKey}
                          type="button"
                          aria-label={`Set icon ${iconKey}`}
                          className={cn(
                            "rounded-xl border p-2",
                            form.icon === iconKey
                              ? "border-foreground bg-accent"
                              : "border-input",
                          )}
                          onClick={() => {
                            setForm((prev) => ({ ...prev, icon: iconKey }));
                          }}
                        >
                          <OptionIcon className="h-4 w-4" />
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            }
            disabled={isSaving}
            surface={isOverlay ? "overlay" : "form"}
            prominent={isOverlay}
          />
        </div>
      ) : null}

      <div className="mt-6 w-full max-w-md px-1">
        <Input
          value={form.category}
          onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
          placeholder="Category"
          className={cn(
            "h-auto border-0 bg-transparent p-0 text-center text-xs uppercase tracking-[0.2em] shadow-none focus-visible:ring-0",
            fieldMuted,
            isOverlay && "placeholder:text-white/35",
          )}
        />
      </div>

      <div className="mt-2 w-full max-w-md px-1">
        <Input
          value={form.title}
          onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="Title"
          className={cn(
            "h-auto border-0 bg-transparent p-0 text-center text-xl font-semibold leading-tight shadow-none focus-visible:ring-0",
            fieldTitle,
            isOverlay && "placeholder:text-white/35",
          )}
        />
      </div>

      <div className="mt-4 w-full max-w-md px-1">
        <textarea
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          onInput={(e) => resizeTextarea(e.currentTarget)}
          placeholder="Description"
          rows={1}
          className={cn(
            "w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-center text-sm leading-relaxed shadow-none focus-visible:ring-0",
            fieldBody,
            isOverlay && "placeholder:text-white/35",
          )}
        />
      </div>

      <div className="relative mx-auto mt-4 flex w-full max-w-[15rem] justify-center">
        <Input
          type="date"
          value={form.achievedAt}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, achievedAt: e.target.value }))
          }
          className={cn(
            "h-11 w-full border-0 bg-transparent pr-[4.5rem] text-center text-xs shadow-none focus-visible:ring-0",
            isOverlay ? "text-white/80" : "",
          )}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Clear date"
          className={cn(
            "absolute right-8 top-1/2 h-8 w-8 -translate-y-1/2 p-0",
            isOverlay
              ? "text-white/45 hover:bg-white/10 hover:text-white"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => setForm((prev) => ({ ...prev, achievedAt: "" }))}
        >
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
        <Button
          type="submit"
          disabled={isSaving}
          className={isOverlay ? "bg-white text-zinc-950 hover:bg-white/90" : ""}
        >
          {isSaving ? "Saving..." : submitLabel}
        </Button>
        {onCancel ? (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isSaving}
            className={
              isOverlay ? "bg-white/10 text-white hover:bg-white/15" : ""
            }
          >
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export function AchievementsManager() {
  const supabase = useMemo(() => createClient(), []);
  const [achievements, setAchievements] = useState<AchievementRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasToneColumn, setHasToneColumn] = useState(true);
  const [hasLockedColumn, setHasLockedColumn] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<FormState>(initialForm);
  const [isCreating, setIsCreating] = useState(false);
  const [detailAchievementId, setDetailAchievementId] = useState<string | null>(
    null,
  );
  const [detailMode, setDetailMode] = useState<"view" | "edit">("view");
  const [panelForm, setPanelForm] = useState<FormState>(initialForm);
  const [hasIconUrlColumn, setHasIconUrlColumn] = useState(true);
  const [hasIconFileIdColumn, setHasIconFileIdColumn] = useState(true);
  const [toneMenuFor, setToneMenuFor] = useState<string | null>(null);
  const [iconMenuFor, setIconMenuFor] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const createBadgeIkSessionRef = useRef<BadgeIkSession>({
    baselineUrl: "",
    baselineFileId: "",
    lastSessionFileId: null,
  });
  const panelBadgeIkSessionRef = useRef<BadgeIkSession>({
    baselineUrl: "",
    baselineFileId: "",
    lastSessionFileId: null,
  });

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

  const DetailFallbackIcon = getSafeIcon(detailAchievement);
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
        ...initialForm,
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
    setToneMenuFor(null);
    setIconMenuFor(null);
  }

  async function loadAchievements() {
    setIsLoading(true);
    setError(null);

    const selectColumns = buildSelectColumns(
      hasToneColumn,
      hasLockedColumn,
      hasIconUrlColumn,
      hasIconFileIdColumn,
    );
    const { data, error } = await supabase
      .from("achievements")
      .select(selectColumns)
      .order("achieved_at", { ascending: false })
      .order("created_at", { ascending: false });

    const errMsg = error?.message.toLowerCase() ?? "";
    if (
      error &&
      (errMsg.includes("tone") ||
        errMsg.includes("is_locked") ||
        errMsg.includes("icon_url") ||
        errMsg.includes("icon_file_id"))
    ) {
      const missingTone = errMsg.includes("tone");
      const missingLocked = errMsg.includes("is_locked");
      const missingIconUrl = errMsg.includes("icon_url");
      const missingIconFileId = errMsg.includes("icon_file_id");
      const nextHasToneColumn = missingTone ? false : hasToneColumn;
      const nextHasLockedColumn = missingLocked ? false : hasLockedColumn;
      const nextHasIconUrlColumn = missingIconUrl ? false : hasIconUrlColumn;
      const nextHasIconFileIdColumn = missingIconFileId
        ? false
        : hasIconFileIdColumn;
      setHasToneColumn(nextHasToneColumn);
      setHasLockedColumn(nextHasLockedColumn);
      setHasIconUrlColumn(nextHasIconUrlColumn);
      setHasIconFileIdColumn(nextHasIconFileIdColumn);

      const fallback = await supabase
        .from("achievements")
        .select(
          buildSelectColumns(
            nextHasToneColumn,
            nextHasLockedColumn,
            nextHasIconUrlColumn,
            nextHasIconFileIdColumn,
          ),
        )
        .order("achieved_at", { ascending: false })
        .order("created_at", { ascending: false });

      if (fallback.error) {
        setError(fallback.error.message);
        setAchievements([]);
        setIsLoading(false);
        return;
      }

      const fallbackRawRows = Array.isArray(fallback.data) ? fallback.data : [];
      const fallbackRows = fallbackRawRows.map((row) =>
        normalizeAchievement(row as unknown as Record<string, unknown>),
      );
      setAchievements(sortAchievements(fallbackRows));
      setIsLoading(false);
      return;
    }

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

    const insertPayload: {
      title: string | null;
      description: string | null;
      category: string | null;
      icon: AchievementIconKey;
      achieved_at: string | null;
      tone?: AchievementTone;
      is_locked?: boolean;
      icon_url?: string | null;
      icon_file_id?: string | null;
    } = {
      title: toNullable(createForm.title),
      description: toNullable(createForm.description),
      category: toNullable(createForm.category),
      icon: createForm.icon,
      achieved_at: toNullable(createForm.achievedAt),
    };

    if (hasToneColumn) {
      insertPayload.tone = createForm.tone;
    }
    if (hasLockedColumn) {
      insertPayload.is_locked = createForm.isLocked;
    }
    if (hasIconUrlColumn) {
      insertPayload.icon_url = toNullable(createForm.iconUrl);
    }
    if (hasIconFileIdColumn) {
      insertPayload.icon_file_id = createForm.iconFileId.trim()
        ? createForm.iconFileId.trim()
        : null;
    }

    const { data, error } = await supabase
      .from("achievements")
      .insert(insertPayload)
      .select(
        buildSelectColumns(
          hasToneColumn,
          hasLockedColumn,
          hasIconUrlColumn,
          hasIconFileIdColumn,
        ),
      )
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
    setCreateForm({ ...initialForm, achievedAt: todayDateString() });
    createBadgeIkSessionRef.current = {
      baselineUrl: "",
      baselineFileId: "",
      lastSessionFileId: null,
    };
    setIsSaving(false);
    setIsCreating(false);
    setDetailAchievementId(null);
    setDetailMode("view");
    setToneMenuFor(null);
    setIconMenuFor(null);
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

    const updatePayload: {
      title: string | null;
      description: string | null;
      category: string | null;
      icon: AchievementIconKey;
      achieved_at: string | null;
      tone?: AchievementTone;
      is_locked?: boolean;
      icon_url?: string | null;
      icon_file_id?: string | null;
    } = {
      title: toNullable(panelForm.title),
      description: toNullable(panelForm.description),
      category: toNullable(panelForm.category),
      icon: panelForm.icon,
      achieved_at: toNullable(panelForm.achievedAt),
    };

    if (hasToneColumn) {
      updatePayload.tone = panelForm.tone;
    }
    if (hasLockedColumn) {
      updatePayload.is_locked = panelForm.isLocked;
    }
    if (hasIconUrlColumn) {
      updatePayload.icon_url = toNullable(panelForm.iconUrl);
    }
    if (hasIconFileIdColumn) {
      updatePayload.icon_file_id = panelForm.iconFileId.trim()
        ? panelForm.iconFileId.trim()
        : null;
    }

    const { data, error } = await supabase
      .from("achievements")
      .update(updatePayload)
      .eq("id", detailAchievementId)
      .select(
        buildSelectColumns(
          hasToneColumn,
          hasLockedColumn,
          hasIconUrlColumn,
          hasIconFileIdColumn,
        ),
      )
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
    setToneMenuFor(null);
    setIconMenuFor(null);
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
                  createBadgeIkSessionRef.current = {
                    baselineUrl: "",
                    baselineFileId: "",
                    lastSessionFileId: null,
                  };
                  setIsCreating(true);
                  setDetailAchievementId(null);
                  setDetailMode("edit");
                  setCreateForm({
                    ...initialForm,
                    achievedAt: todayDateString(),
                  });
                  setToneMenuFor(null);
                  setIconMenuFor(null);
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
                <p className="line-clamp-2 w-full text-[11px] font-medium leading-tight text-white/55 group-hover:text-white/80 sm:text-xs">
                  Add achievement
                </p>
                <p className="text-[10px] text-white/35 sm:text-[11px]">—</p>
              </button>

              {achievements.map((achievement) => {
                const Icon = getSafeIcon(achievement);
                const tone = resolveTone(achievement);
                return (
                  <AchievementGridItem
                    key={achievement.id}
                    title={achievement.title}
                    dateLabel={formatGridDate(achievement.achieved_at)}
                    iconUrl={achievement.icon_url}
                    FallbackIcon={Icon}
                    tone={tone}
                    isLocked={Boolean(achievement.is_locked)}
                    onClick={() => {
                      setDetailAchievementId(achievement.id);
                      setDetailMode("view");
                      setIsCreating(false);
                      setToneMenuFor(null);
                      setIconMenuFor(null);
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
                      "relative mx-auto my-auto w-full max-w-lg max-h-[min(88dvh,56rem)] overflow-y-auto overscroll-y-contain rounded-2xl border border-white/10 bg-zinc-950 p-6 pb-8 shadow-2xl sm:pb-6",
                      (isCreating || detailMode === "edit") &&
                        "overflow-x-hidden",
                    )}
                    onClick={(e) => e.stopPropagation()}
                  >
            <button
              type="button"
              aria-label="Close"
              className="absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10 rounded-full border border-white/15 bg-white/5 p-2 text-white/80 transition hover:bg-white/10"
              onClick={() => closeDetailPanel()}
            >
              <X className="h-4 w-4" />
            </button>

            {isCreating ? (
              <EditableAchievementCard
                id="create-overlay"
                form={createForm}
                setForm={setCreateForm}
                submitLabel="Save"
                isSaving={isSaving}
                onSubmit={handleCreate}
                onCancel={() => {
                  rollbackBadgeSession(createBadgeIkSessionRef);
                  setCreateForm({
                    ...initialForm,
                    achievedAt: todayDateString(),
                  });
                  setIsCreating(false);
                  setDetailMode("view");
                  setToneMenuFor(null);
                  setIconMenuFor(null);
                }}
                hasIconUrlColumn={hasIconUrlColumn}
                hasIconFileIdColumn={hasIconFileIdColumn}
                badgeIkSessionRef={createBadgeIkSessionRef}
                baselineIconFileId={createBadgeIkSessionRef.current.baselineFileId}
                appearance="overlay"
                toneMenuFor={toneMenuFor}
                setToneMenuFor={setToneMenuFor}
                iconMenuFor={iconMenuFor}
                setIconMenuFor={setIconMenuFor}
              />
            ) : detailMode === "view" && detailAchievement ? (
              <div className="flex w-full flex-col items-center pt-2">
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

                <p className="mt-8 w-full text-center text-[11px] font-medium uppercase tracking-[0.2em] text-white/45">
                  {(detailAchievement.category?.trim() ||
                    (detailAchievement.is_locked ? "Locked" : "Uncategorized"))}
                </p>
                <h2
                  id="achievement-detail-title"
                  className="mt-2 text-center text-xl font-semibold tracking-tight text-white"
                >
                  {detailAchievement.title?.trim() ||
                    (detailAchievement.is_locked ? "Locked" : "Untitled")}
                </h2>
                <p className="mt-4 break-words text-center text-sm leading-relaxed text-white/65">
                  {detailAchievement.is_locked
                    ? detailAchievement.description?.trim() ||
                      "This achievement is locked."
                    : detailAchievement.description?.trim() || "No description yet."}
                </p>
                {formatAchievedAt(detailAchievement.achieved_at) ? (
                  <p className="mt-4 text-center text-xs text-white/40">
                    {formatAchievedAt(detailAchievement.achieved_at)}
                  </p>
                ) : null}

                <div className="mt-8 flex flex-wrap justify-center gap-2">
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
                      setToneMenuFor(null);
                      setIconMenuFor(null);
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
                id="panel"
                form={panelForm}
                setForm={setPanelForm}
                submitLabel="Save"
                isSaving={isSaving}
                onSubmit={handlePanelSave}
                onCancel={() => {
                  rollbackBadgeSession(panelBadgeIkSessionRef);
                  if (detailAchievement) {
                    setPanelForm(achievementToForm(detailAchievement));
                  }
                  setDetailMode("view");
                  setToneMenuFor(null);
                  setIconMenuFor(null);
                }}
                hasIconUrlColumn={hasIconUrlColumn}
                hasIconFileIdColumn={hasIconFileIdColumn}
                badgeIkSessionRef={panelBadgeIkSessionRef}
                baselineIconFileId={
                  panelBadgeIkSessionRef.current.baselineFileId
                }
                appearance="overlay"
                toneMenuFor={toneMenuFor}
                setToneMenuFor={setToneMenuFor}
                iconMenuFor={iconMenuFor}
                setIconMenuFor={setIconMenuFor}
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
