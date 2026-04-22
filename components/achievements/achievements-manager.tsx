"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Lock,
  Sparkles,
  Unlock,
  X,
} from "lucide-react";
import {
  BookOpenText,
  Brain,
  Camera,
  Compass,
  Crown,
  Drop,
  FlagPennant,
  Flame,
  GlobeHemisphereWest,
  Heartbeat,
  Leaf,
  LockSimple,
  Medal,
  PaintBrush,
  Planet,
  PuzzlePiece,
  RocketLaunch,
  SealCheck,
  ShootingStar,
  Sparkle,
  Star,
  SunHorizon,
  Target,
  Trophy,
  WaveSine,
  Lightning,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";

import {
  AchievementCard,
  achievementToneStyles,
  achievementToneSwatches,
  type AchievementTone,
} from "@/components/achievements/achievement-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type AchievementRecord = {
  id: string;
  title: string | null;
  description: string | null;
  category: string | null;
  icon: string | null;
  tone: AchievementTone | null;
  is_locked: boolean | null;
  achieved_at: string | null;
  created_at: string;
};

const BASE_SELECT_COLUMNS = "id,title,description,category,icon,achieved_at,created_at";

function buildSelectColumns(hasTone: boolean, hasLocked: boolean) {
  return `${BASE_SELECT_COLUMNS}${hasTone ? ",tone" : ""}${hasLocked ? ",is_locked" : ""}`;
}

function normalizeAchievement(row: Record<string, unknown>): AchievementRecord {
  return {
    id: String(row.id),
    title: (row.title as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    category: (row.category as string | null) ?? null,
    icon: (row.icon as string | null) ?? null,
    tone: (row.tone as AchievementTone | null) ?? null,
    is_locked: Boolean(row.is_locked),
    achieved_at: (row.achieved_at as string | null) ?? null,
    created_at: String(row.created_at),
  };
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

const iconMap: Record<AchievementIconKey, PhosphorIcon> = {
  trophy: Trophy,
  medal: Medal,
  star: Star,
  sparkles: Sparkle,
  flame: Flame,
  award: SealCheck,
  rocket: RocketLaunch,
  shield: SealCheck,
  compass: Compass,
  globe: GlobeHemisphereWest,
  leaf: Leaf,
  gem: Star,
  zap: Lightning,
  crown: Crown,
  brain: Brain,
  heart: Heartbeat,
  target: Target,
  book: BookOpenText,
  camera: Camera,
  palette: PaintBrush,
  orbit: Planet,
  puzzle: PuzzlePiece,
  waves: WaveSine,
  sunrise: SunHorizon,
  flag: FlagPennant,
  pen: Drop,
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

type FormState = {
  title: string;
  description: string;
  category: string;
  icon: AchievementIconKey;
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
  tone: "gold",
  isLocked: false,
  achievedAt: todayDateString(),
};

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

function getSafeIconKey(value: string | null) {
  if (!value) return "trophy";
  return value in iconMap ? (value as AchievementIconKey) : "trophy";
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

type EditorCardProps = {
  id: string;
  mode: "create" | "edit";
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  submitLabel: string;
  isSaving: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel?: () => void;
  toneMenuFor: string | null;
  setToneMenuFor: React.Dispatch<React.SetStateAction<string | null>>;
  iconMenuFor: string | null;
  setIconMenuFor: React.Dispatch<React.SetStateAction<string | null>>;
};

function EditableAchievementCard({
  id,
  mode,
  form,
  setForm,
  submitLabel,
  isSaving,
  onSubmit,
  onCancel,
  toneMenuFor,
  setToneMenuFor,
  iconMenuFor,
  setIconMenuFor,
}: EditorCardProps) {
  const Icon = iconMap[form.icon];
  const toneMenuOpen = toneMenuFor === id;
  const iconMenuOpen = iconMenuFor === id;

  function resizeTextarea(target: HTMLTextAreaElement) {
    target.style.height = "0px";
    target.style.height = `${target.scrollHeight}px`;
  }

  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        "relative overflow-visible rounded-3xl border bg-card/90 p-5 shadow-sm",
        "flex flex-col gap-3",
        `bg-gradient-to-br ${achievementToneStyles[form.tone]}`,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/20 blur-2xl"
      />

      <div className="absolute right-3 top-3 z-30">
        <button
          type="button"
          aria-label="Select tone"
          className={cn(
            "h-5 w-5 rounded-full border border-white/70 shadow-sm",
            achievementToneSwatches[form.tone],
          )}
          onClick={() => {
            setToneMenuFor(toneMenuOpen ? null : id);
            setIconMenuFor(null);
          }}
        />
        {toneMenuOpen ? (
          <div className="absolute right-0 top-7 flex gap-2 rounded-full border bg-background/95 p-2 shadow-lg backdrop-blur-sm">
            {(Object.keys(achievementToneSwatches) as AchievementTone[]).map((tone) => (
              <button
                key={tone}
                type="button"
                aria-label={`Set tone ${tone}`}
                className={cn(
                  "h-5 w-5 rounded-full border transition-transform",
                  achievementToneSwatches[tone],
                  form.tone === tone ? "scale-110 border-foreground" : "border-white/60",
                )}
                onClick={() => {
                  setForm((prev) => ({ ...prev, tone }));
                  setToneMenuFor(null);
                }}
              />
            ))}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        aria-label={form.isLocked ? "Set unlocked" : "Set locked"}
        className="absolute right-10 top-3 z-30 rounded-full border border-white/70 bg-white/60 p-1.5 text-foreground/80 shadow-sm backdrop-blur-sm dark:bg-white/10"
        onClick={() =>
          setForm((prev) => ({
            ...prev,
            isLocked: !prev.isLocked,
          }))
        }
      >
        {form.isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
      </button>

      <div className="pr-20">
        <Input
          value={form.category}
          onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
          placeholder="Participation"
          className="h-auto border-0 bg-transparent p-0 text-xs uppercase tracking-wide text-muted-foreground shadow-none focus-visible:ring-0"
        />
      </div>

      <div className="grid grid-cols-[1fr_auto] items-start gap-3">
        <div>
          <Input
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Achievement title"
            className="h-auto border-0 bg-transparent p-0 text-lg font-semibold leading-tight shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="relative z-20">
          <button
            type="button"
            aria-label="Select icon"
            className="rounded-2xl border border-white/30 bg-white/40 p-2.5 text-foreground/80 backdrop-blur-sm dark:bg-white/10"
            onClick={() => {
              setIconMenuFor(iconMenuOpen ? null : id);
              setToneMenuFor(null);
            }}
          >
            <Icon className="h-5 w-5" weight="fill" />
          </button>
          {iconMenuOpen ? (
            <div className="absolute right-0 top-11 w-64 grid grid-cols-6 gap-2 rounded-2xl border bg-background/95 p-2 shadow-lg backdrop-blur-sm">
              {(Object.keys(iconMap) as AchievementIconKey[]).map((iconKey) => {
                const OptionIcon = iconMap[iconKey];
                return (
                  <button
                    key={iconKey}
                    type="button"
                    aria-label={`Set icon ${iconKey}`}
                    className={cn(
                      "rounded-xl border p-2",
                      form.icon === iconKey ? "border-foreground bg-accent" : "border-input",
                    )}
                    onClick={() => {
                      setForm((prev) => ({ ...prev, icon: iconKey }));
                      setIconMenuFor(null);
                    }}
                  >
                    <OptionIcon className="h-4 w-4" weight="fill" />
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      <div>
        <textarea
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          onInput={(e) => resizeTextarea(e.currentTarget)}
          placeholder="Describe the achievement..."
          rows={1}
          className="w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-sm leading-relaxed text-foreground/90 shadow-none focus-visible:ring-0"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Input
          type="date"
          value={form.achievedAt}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, achievedAt: e.target.value }))
          }
          className="h-9 min-w-0 flex-1 text-xs sm:h-8 sm:flex-none sm:w-fit"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 shrink-0 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground sm:h-8"
          onClick={() => setForm((prev) => ({ ...prev, achievedAt: "" }))}
        >
          <X className="h-3.5 w-3.5" aria-hidden />
          Clear date
        </Button>
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isSaving}>
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(initialForm);
  const [toneMenuFor, setToneMenuFor] = useState<string | null>(null);
  const [iconMenuFor, setIconMenuFor] = useState<string | null>(null);

  useEffect(() => {
    void loadAchievements();
  }, []);

  async function loadAchievements() {
    setIsLoading(true);
    setError(null);

    const selectColumns = buildSelectColumns(hasToneColumn, hasLockedColumn);
    const { data, error } = await supabase
      .from("achievements")
      .select(selectColumns)
      .order("achieved_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (
      error &&
      (error.message.toLowerCase().includes("tone") ||
        error.message.toLowerCase().includes("is_locked"))
    ) {
      const missingTone = error.message.toLowerCase().includes("tone");
      const missingLocked = error.message.toLowerCase().includes("is_locked");
      const nextHasToneColumn = missingTone ? false : hasToneColumn;
      const nextHasLockedColumn = missingLocked ? false : hasLockedColumn;
      setHasToneColumn(nextHasToneColumn);
      setHasLockedColumn(nextHasLockedColumn);

      const fallback = await supabase
        .from("achievements")
        .select(buildSelectColumns(nextHasToneColumn, nextHasLockedColumn))
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

  async function handleCreate(e: React.FormEvent) {
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

    const { data, error } = await supabase
      .from("achievements")
      .insert(insertPayload)
      .select(buildSelectColumns(hasToneColumn, hasLockedColumn))
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
    if (!normalized.is_locked) {
      playUnlockSaveChime();
    }
    setAchievements((prev) => sortAchievements([normalized, ...prev]));
    setCreateForm({ ...initialForm, achievedAt: todayDateString() });
    setIsSaving(false);
    setIsCreating(false);
    setActiveCardId(null);
    setToneMenuFor(null);
    setIconMenuFor(null);
  }

  function beginEdit(achievement: AchievementRecord) {
    setEditingId(achievement.id);
    setEditForm({
      title: achievement.title ?? "",
      description: achievement.description ?? "",
      category: achievement.category ?? "",
      icon: getSafeIconKey(achievement.icon),
      tone:
        achievement.tone ??
        toneByIcon[getSafeIconKey(achievement.icon)],
      isLocked: Boolean(achievement.is_locked),
      achievedAt: achievement.achieved_at ?? "",
    });
    setToneMenuFor(null);
    setIconMenuFor(null);
    setActiveCardId(null);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    if (!hasMeaningfulContent(editForm)) {
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
    } = {
      title: toNullable(editForm.title),
      description: toNullable(editForm.description),
      category: toNullable(editForm.category),
      icon: editForm.icon,
      achieved_at: toNullable(editForm.achievedAt),
    };

    if (hasToneColumn) {
      updatePayload.tone = editForm.tone;
    }
    if (hasLockedColumn) {
      updatePayload.is_locked = editForm.isLocked;
    }

    const { data, error } = await supabase
      .from("achievements")
      .update(updatePayload)
      .eq("id", editingId)
      .select(buildSelectColumns(hasToneColumn, hasLockedColumn))
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
    if (!normalized.is_locked) {
      playUnlockSaveChime();
    }
    setAchievements((prev) =>
      sortAchievements(
        prev.map((achievement) =>
          achievement.id === normalized.id ? normalized : achievement,
        ),
      ),
    );
    setEditingId(null);
    setEditForm({ ...initialForm, achievedAt: todayDateString() });
    setIsSaving(false);
    setActiveCardId(null);
    setToneMenuFor(null);
    setIconMenuFor(null);
  }

  async function handleDelete(id: string) {
    setIsSaving(true);
    setError(null);

    const { error } = await supabase.from("achievements").delete().eq("id", id);

    if (error) {
      setError(error.message);
      setIsSaving(false);
      return;
    }

    setAchievements((prev) => prev.filter((achievement) => achievement.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setEditForm({ ...initialForm, achievedAt: todayDateString() });
    }
    setIsSaving(false);
    setActiveCardId(null);
  }

  return (
    <div className="space-y-6">
      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading achievements...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isCreating ? (
            <EditableAchievementCard
              id="create"
              mode="create"
              form={createForm}
              setForm={setCreateForm}
              submitLabel="Save"
              isSaving={isSaving}
              onSubmit={handleCreate}
              onCancel={() => {
                setIsCreating(false);
                setToneMenuFor(null);
                setIconMenuFor(null);
                setActiveCardId(null);
              }}
              toneMenuFor={toneMenuFor}
              setToneMenuFor={setToneMenuFor}
              iconMenuFor={iconMenuFor}
              setIconMenuFor={setIconMenuFor}
            />
          ) : (
            <button
              type="button"
              className={cn(
                "group rounded-3xl border border-dashed border-muted-foreground/30 bg-transparent p-5",
                "flex flex-col items-center justify-center gap-3 text-muted-foreground transition-all",
                "hover:border-foreground/40 hover:bg-muted/30 hover:text-foreground",
              )}
              onClick={() => {
                setIsCreating(true);
                setEditingId(null);
                setActiveCardId(null);
                setCreateForm({ ...initialForm, achievedAt: todayDateString() });
              }}
            >
              <div className="rounded-full border border-current/40 p-3">
                <Sparkles className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium">Add achievement</p>
            </button>
          )}

          {achievements.map((achievement) => {
            const safeIconKey = getSafeIconKey(achievement.icon);
            const Icon = iconMap[safeIconKey];
            const tone = achievement.tone ?? toneByIcon[safeIconKey];
            const isLocked = Boolean(achievement.is_locked);

            if (editingId === achievement.id) {
              return (
                <EditableAchievementCard
                  key={achievement.id}
                  id={achievement.id}
                  mode="edit"
                  form={editForm}
                  setForm={setEditForm}
                  submitLabel="Save"
                  isSaving={isSaving}
                  onSubmit={handleUpdate}
                  onCancel={() => {
                    setEditingId(null);
                    setToneMenuFor(null);
                    setIconMenuFor(null);
                  }}
                  toneMenuFor={toneMenuFor}
                  setToneMenuFor={setToneMenuFor}
                  iconMenuFor={iconMenuFor}
                  setIconMenuFor={setIconMenuFor}
                />
              );
            }

            return (
              <AchievementCard
                key={achievement.id}
                  onClick={() =>
                    setActiveCardId((prev) =>
                      prev === achievement.id ? null : achievement.id,
                    )
                  }
                title={achievement.title ?? (isLocked ? "Locked achievement" : undefined)}
                description={
                  isLocked
                    ? achievement.description ?? "Keep progressing to unlock this achievement."
                    : achievement.description
                }
                category={isLocked ? "Locked" : achievement.category ?? undefined}
                awardedAt={formatAchievedAt(achievement.achieved_at)}
                icon={isLocked ? LockSimple : Icon}
                tone={tone}
                className={
                  isLocked
                    ? "border-dashed border-muted-foreground/40 bg-transparent opacity-85 saturate-0"
                    : undefined
                }
                action={
                  activeCardId === achievement.id ? (
                    <div
                      className="flex items-center gap-1 rounded-full border border-white/40 bg-white/65 p-1 shadow-sm backdrop-blur-sm dark:bg-slate-900/80"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-7 rounded-full px-3 text-xs"
                        onClick={() => beginEdit(achievement)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="h-7 rounded-full px-3 text-xs"
                        onClick={() => void handleDelete(achievement.id)}
                        disabled={isSaving}
                      >
                        Delete
                      </Button>
                    </div>
                  ) : null
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
