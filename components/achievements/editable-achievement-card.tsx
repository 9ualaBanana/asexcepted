"use client";

import {
  useEffect,
  useRef,
  type Dispatch,
  type FormEvent,
  type RefObject,
  type SetStateAction,
} from "react";
import { Lock, Unlock, X } from "lucide-react";

import {
  achievementToneStyles,
  achievementToneSwatches,
  type AchievementTone,
} from "@/components/achievements/achievement-card";
import { AchievementRoundBadgeEditor } from "@/components/achievements/achievement-round-badge-editor";
import {
  type AchievementIconKey,
  type BadgeIkSession,
  type FormState,
  iconMap,
} from "@/components/achievements/achievement-editor-shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteImageKitFile } from "@/lib/imagekit-client";
import { cn } from "@/lib/utils";

function deletePreviousSessionUpload(ref: RefObject<BadgeIkSession>) {
  const s = ref.current;
  const prev = s.lastSessionFileId?.trim() ?? "";
  const baseline = s.baselineFileId.trim();
  if (prev && prev !== baseline) {
    void deleteImageKitFile(prev).catch(() => undefined);
  }
}

export type EditorCardProps = {
  id: string;
  form: FormState;
  setForm: Dispatch<SetStateAction<FormState>>;
  submitLabel: string;
  isSaving: boolean;
  onSubmit: (e: FormEvent) => void;
  onCancel?: () => void;
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

export function EditableAchievementCard({
  id,
  form,
  setForm,
  submitLabel,
  isSaving,
  onSubmit,
  onCancel,
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

      <div className={cn(isOverlay ? "mt-8" : "mt-5")}>
        <AchievementRoundBadgeEditor
          instanceId={id}
          imageUrl={form.iconUrl}
          iconFileId={form.iconFileId}
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
