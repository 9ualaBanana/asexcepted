"use client";

import { ImagePlus, Lock, Trash2, Unlock } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import {
  achievementToneSwatches,
  type AchievementTone,
} from "@/components/achievements/achievement-card";
import { AchievementBadgeSlot } from "@/components/achievements/badge/achievement-badge-slot";
import { AchievementFallbackBadge } from "@/components/achievements/badge/achievement-fallback-badge";
import { RemoteBadgeImage } from "@/components/achievements/badge/achievement-remote-badge-image";
import {
  deleteImageKitFileQuietly,
  getReplacedImageKitFileId,
  normalizeImageKitFileId,
} from "@/components/achievements/badge/badge-imagekit-session";
import {
  type AchievementIconKey,
  iconMap,
} from "@/components/achievements/achievement-editor-shared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBadgeImageUploader } from "@/components/achievements/badge/use-badge-image-uploader";

import "@uppy/core/css/style.min.css";

const EDITOR_TONE_OPTIONS: AchievementTone[] = [
  "teal",
  "rose",
  "lime",
  "fuchsia",
  "orange",
  "indigo",
];

const chipBtn =
  "border-white/25 bg-white/10 text-white hover:bg-white/15";

type AchievementRoundBadgeEditorProps = {
  imageUrl: string;
  iconFileId: string;
  /** Saved badge file id at edit/create session start (empty when creating). */
  baselineIconFileId: string;
  tone: AchievementTone;
  isLocked: boolean;
  icon: AchievementIconKey;
  onToneChange: (tone: AchievementTone) => void;
  onToggleLocked: () => void;
  onIconChange: (icon: AchievementIconKey) => void;
  /** Called after a successful ImageKit upload with the new URL + fileId. */
  onRemoteUploadCommit: (url: string, fileId: string) => void;
  onImageUrlChange: (url: string) => void;
  onIconFileIdChange: (fileId: string) => void;
  /** Clear staged-upload pointer when the in-progress image is removed locally. */
  onStagedUploadCleared?: () => void;
  /** Signals when remote badge upload is currently in flight. */
  onUploadInProgressChange?: (inProgress: boolean) => void;
  disabled?: boolean;
};

export function AchievementRoundBadgeEditor({
  imageUrl,
  iconFileId,
  baselineIconFileId,
  tone,
  isLocked,
  icon,
  onToneChange,
  onToggleLocked,
  onIconChange,
  onRemoteUploadCommit,
  onImageUrlChange,
  onIconFileIdChange,
  onStagedUploadCleared,
  onUploadInProgressChange,
  disabled = false,
}: AchievementRoundBadgeEditorProps) {
  const uppyInstanceId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const tonePickerRef = useRef<HTMLDivElement>(null);
  const iconPickerRef = useRef<HTMLDivElement>(null);
  const onRemoteCommitRef = useRef(onRemoteUploadCommit);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toneMenuOpen, setToneMenuOpen] = useState(false);
  const [iconMenuOpen, setIconMenuOpen] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const removeTitleId = useId();
  const FallbackIcon = iconMap[icon];

  onRemoteCommitRef.current = onRemoteUploadCommit;

  useEffect(() => {
    if (!menuOpen) {
      setToneMenuOpen(false);
      setIconMenuOpen(false);
    }
  }, [menuOpen]);

  useEffect(() => {
    if (!toneMenuOpen && !iconMenuOpen) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      const toneEl = tonePickerRef.current;
      const iconEl = iconPickerRef.current;
      const inTone = toneEl ? toneEl.contains(target) : false;
      const inIcon = iconEl ? iconEl.contains(target) : false;
      if (!inTone && !inIcon) {
        setToneMenuOpen(false);
        setIconMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [iconMenuOpen, toneMenuOpen]);

  const trimmed = imageUrl.trim();
  const hasRemote = trimmed.length > 0;
  const fileIdTrim = normalizeImageKitFileId(iconFileId);
  const baselineIdTrim = normalizeImageKitFileId(baselineIconFileId);
  const hasCustomBadge = hasRemote || !!fileIdTrim;

  const { queueUpload, uploadInProgress } = useBadgeImageUploader({
    instanceId: uppyInstanceId,
    disabled,
    onUploadSuccess: (url, fileId) => {
      setError(null);
      onRemoteCommitRef.current(url, fileId);
      setMenuOpen(false);
    },
    onUploadError: (message) => setError(message),
    onUploadStart: () => setError(null),
    onUploadInProgressChange,
  });

  const busy = uploadInProgress || isRemoving;

  useEffect(() => {
    if (!menuOpen && !removeConfirmOpen) return;
    function onDocPointerDown(e: MouseEvent) {
      const root = rootRef.current;
      if (root && !root.contains(e.target as Node)) {
        setMenuOpen(false);
        setRemoveConfirmOpen(false);
      }
    }
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [menuOpen, removeConfirmOpen]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      const f = e.dataTransfer.files?.[0];
      if (f?.type.startsWith("image/")) queueUpload(f);
    },
    [queueUpload],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setDragActive(true);
  }, [disabled]);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const ringHalo = cn(
    dragActive && "ring-2 ring-inset ring-white/55",
  );

  const size = "detail";

  async function confirmRemoveImage() {
    setIsRemoving(true);
    setError(null);
    try {
      const fileIdToDelete = getReplacedImageKitFileId(fileIdTrim, baselineIdTrim);
      await deleteImageKitFileQuietly(fileIdToDelete, (e) => console.warn(e));
      onImageUrlChange("");
      onIconFileIdChange("");
      onStagedUploadCleared?.();
      setRemoveConfirmOpen(false);
      setMenuOpen(false);
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <div ref={rootRef} className="group/badge relative flex flex-col items-center">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) queueUpload(f);
        }}
      />

      <AchievementBadgeSlot size={size}>
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() =>
            !disabled && !busy && setMenuOpen((o) => !o)
          }
          onDragEnter={onDragOver}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn(
            "relative flex h-full w-full min-h-0 min-w-0 cursor-pointer items-center justify-center rounded-none bg-transparent outline-none transition-shadow",
            hasRemote ? "overflow-hidden" : "overflow-visible",
            "focus-visible:outline-none",
            ringHalo,
            isLocked && "opacity-75 grayscale",
          )}
          aria-label="Badge"
        >
        {busy ? (
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute isolate flex items-center justify-center",
              "inset-[-10px]"
            )}
          >
            <div className="badge-upload-bloom absolute inset-0 rounded-full" />
            <div className="badge-upload-blob badge-upload-blob-a absolute h-[78%] w-[78%] rounded-full" />
            <div className="badge-upload-blob badge-upload-blob-b absolute h-[64%] w-[64%] rounded-full" />
            <div className="badge-upload-blob badge-upload-blob-c absolute h-[56%] w-[56%] rounded-full" />
          </div>
        ) : null}
        {hasRemote ? (
          <RemoteBadgeImage
            src={trimmed}
            className={cn(
              "p-1 transition-all duration-500 ease-out",
              "h-full w-full object-contain drop-shadow-lg",
              busy && "scale-[0.96] blur-[3.5px] opacity-[0.72]",
            )}
          />
        ) : (
          <div
            className={cn(
              "h-full w-full transition-all duration-500 ease-out",
              busy && "scale-[0.96] blur-[3.5px] opacity-[0.72]",
            )}
          >
            <AchievementFallbackBadge
              tone={tone}
              isLocked={isLocked}
              FallbackIcon={FallbackIcon}
              size={size}
            />
          </div>
        )}
        </button>
        <div className="group/lock pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
          <button
            type="button"
            aria-label={isLocked ? "Set unlocked" : "Set locked"}
            className={cn(
              "pointer-events-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full border shadow-sm transition-opacity duration-300 sm:h-11 sm:w-11",
              chipBtn,
              isLocked
                ? "opacity-100"
                : "opacity-55",
            )}
            onClick={onToggleLocked}
          >
            {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
          </button>
        </div>
      </AchievementBadgeSlot>
      {menuOpen && !removeConfirmOpen ? (
        <div
          className="mt-2 flex max-w-[min(100%,22rem)] flex-wrap items-center justify-center gap-2 sm:gap-2.5"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            disabled={disabled || busy}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full border shadow-md transition sm:h-11 sm:w-11",
              "border-white/20 bg-white/10 text-white hover:bg-white/15",
            )}
            aria-label="Choose badge image"
            onClick={() => {
              fileInputRef.current?.click();
              setMenuOpen(false);
            }}
          >
            <ImagePlus className="h-5 w-5" />
          </button>

          {!hasCustomBadge ? (
            <>
              <div ref={tonePickerRef} className="relative flex h-10 items-center sm:h-11">
                <button
                  type="button"
                  aria-label="Select tone"
                  className={cn(
                    "h-10 w-10 shrink-0 rounded-full border shadow-sm sm:h-11 sm:w-11",
                    achievementToneSwatches[tone],
                    "border-white/50",
                  )}
                  onClick={() => {
                    setToneMenuOpen((o) => !o);
                    setIconMenuOpen(false);
                  }}
                />
                {toneMenuOpen ? (
                  <div className="absolute left-1/2 top-10 z-40 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-nowrap items-center gap-1.5 overflow-x-auto rounded-2xl border bg-background/95 p-2 shadow-lg backdrop-blur-sm [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:top-11 sm:gap-2">
                    {EDITOR_TONE_OPTIONS.map((toneKey) => (
                      <button
                        key={toneKey}
                        type="button"
                        aria-label={`Set tone ${toneKey}`}
                        className={cn(
                          "h-8 w-8 shrink-0 rounded-full border transition-transform",
                          achievementToneSwatches[toneKey],
                          tone === toneKey
                            ? "scale-110 border-foreground"
                            : "border-white/60",
                        )}
                        onClick={() => {
                          onToneChange(toneKey);
                        }}
                      />
                    ))}
                  </div>
                ) : null}
              </div>

              <div ref={iconPickerRef} className="relative flex h-10 items-center sm:h-11">
                <button
                  type="button"
                  aria-label="Select icon"
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border shadow-sm sm:h-11 sm:w-11",
                    chipBtn,
                  )}
                  onClick={() => {
                    setIconMenuOpen((o) => !o);
                    setToneMenuOpen(false);
                  }}
                >
                  <FallbackIcon className="h-4 w-4" />
                </button>
                {iconMenuOpen ? (
                  <div className="absolute left-1/2 top-11 z-40 grid w-64 max-w-[calc(100vw-2rem)] -translate-x-1/2 grid-cols-6 gap-1.5 rounded-2xl border bg-background/95 p-2 shadow-lg backdrop-blur-sm sm:top-12 sm:gap-2">
                    {(Object.keys(iconMap) as AchievementIconKey[]).map((iconKey) => {
                      const OptionIcon = iconMap[iconKey];
                      return (
                        <button
                          key={iconKey}
                          type="button"
                          aria-label={`Set icon ${iconKey}`}
                          className={cn(
                            "rounded-xl border p-2",
                            icon === iconKey
                              ? "border-foreground bg-accent"
                              : "border-input",
                          )}
                          onClick={() => {
                            onIconChange(iconKey);
                          }}
                        >
                          <OptionIcon className="h-4 w-4" />
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </>
          ) : null}

          {hasCustomBadge && (
            <button
              type="button"
              disabled={disabled || busy}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border shadow-md transition sm:h-11 sm:w-11",
                "border-red-400/40 bg-red-500/15 text-red-100 hover:bg-red-500/25",
              )}
              aria-label="Remove badge image"
              onClick={() => {
                setRemoveConfirmOpen(true);
                setMenuOpen(false);
              }}
            >
              <Trash2 className="h-5 w-5" />
            </button>
          )}
        </div>
      ) : null}

      {removeConfirmOpen ? (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={removeTitleId}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          onClick={() => !busy && setRemoveConfirmOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-card p-6 text-card-foreground shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id={removeTitleId} className="text-lg font-semibold text-white">
              Remove badge image?
            </h2>
            <p className="mt-2 text-sm text-white/55">
              The preview will fall back to your selected icon. The stored image
              is removed from ImageKit when you save, or immediately if it was
              only uploaded during this session.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                className="bg-white/10 text-white hover:bg-white/15"
                disabled={busy}
                onClick={() => setRemoveConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={busy}
                onClick={() => void confirmRemoveImage()}
              >
                {busy ? "Removing…" : "Remove"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <p
          className={cn(
            "mt-2 max-w-[220px] text-center text-xs",
            "text-red-300",
          )}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
