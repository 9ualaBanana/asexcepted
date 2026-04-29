"use client";

import Uppy from "@uppy/core";
import XHRUpload from "@uppy/xhr-upload";
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
  type AchievementIconKey,
  iconMap,
} from "@/components/achievements/achievement-editor-shared";
import { Button } from "@/components/ui/button";
import { deleteImageKitFile, getImageKitUploadAuth } from "@/lib/imagekit-client";
import { cn } from "@/lib/utils";

import "@uppy/core/css/style.min.css";

const IMAGEKIT_UPLOAD_ENDPOINT =
  "https://upload.imagekit.io/api/v1/files/upload";

const META_FIELDS = [
  "publicKey",
  "signature",
  "expire",
  "token",
  "fileName",
  "folder",
  "useUniqueFileName",
  "responseFields",
] as const;

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
  const uppyRef = useRef<Uppy | null>(null);
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
  const [busy, setBusy] = useState(false);
  const [uploadInProgress, setUploadInProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const removeTitleId = useId();
  const FallbackIcon = iconMap[icon];

  onRemoteCommitRef.current = onRemoteUploadCommit;

  useEffect(() => {
    onUploadInProgressChange?.(uploadInProgress);
  }, [onUploadInProgressChange, uploadInProgress]);

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
  const fileIdTrim = iconFileId.trim();
  const baselineIdTrim = baselineIconFileId.trim();
  const hasCustomBadge = hasRemote || !!fileIdTrim;

  useEffect(() => {
    const uppy = new Uppy({
      id: `round-badge-${uppyInstanceId}`,
      autoProceed: true,
      restrictions: {
        maxNumberOfFiles: 1,
        maxFileSize: 15 * 1024 * 1024,
        allowedFileTypes: ["image/*"],
      },
    });

    uppy.use(XHRUpload, {
      endpoint: IMAGEKIT_UPLOAD_ENDPOINT,
      method: "post",
      formData: true,
      fieldName: "file",
      allowedMetaFields: [...META_FIELDS],
    });

    uppy.addPreProcessor(async (fileIDs) => {
      const data = await getImageKitUploadAuth();

      for (const id of fileIDs) {
        const file = uppy.getFile(id);
        const safeName =
          file?.name?.replace(/[^\w.\-]+/g, "_").slice(0, 120) || "badge";
        uppy.setFileMeta(id, {
          publicKey: data.publicKey,
          signature: data.signature,
          expire: String(data.expire),
          token: data.token,
          fileName: safeName,
          folder: data.folder ?? "achievements",
          useUniqueFileName: "true",
          responseFields: "url,fileId",
        });
      }
    });

    uppy.on("upload-success", async (_file, response) => {
      const body = response.body as { url?: string; fileId?: string } | undefined;
      const url =
        typeof response.uploadURL === "string"
          ? response.uploadURL
          : typeof body?.url === "string"
            ? body.url
            : null;
      const newFileId = typeof body?.fileId === "string" ? body.fileId : "";
      if (!url) {
        setError("Upload finished without a URL.");
        setUploadInProgress(false);
        setBusy(false);
        return;
      }

      // Keep visual upload state until the fresh remote image is actually fetchable.
      try {
        await new Promise<void>((resolve) => {
          const img = new Image();
          let settled = false;
          const done = () => {
            if (settled) return;
            settled = true;
            resolve();
          };
          img.onload = done;
          img.onerror = done;
          img.src = `${url}${url.includes("?") ? "&" : "?"}ready=${Date.now()}`;
          setTimeout(done, 4000);
        });
      } catch {
        // no-op: commit anyway
      }

      setError(null);
      onRemoteCommitRef.current(url, newFileId);
      uppy.cancelAll();
      setMenuOpen(false);
      setUploadInProgress(false);
      setBusy(false);
    });

    uppy.on("upload-error", (_file, err) => {
      setUploadInProgress(false);
      setBusy(false);
      setError(err?.message ?? "Upload failed.");
    });

    uppyRef.current = uppy;
    return () => {
      uppy.destroy();
      uppyRef.current = null;
    };
  }, [uppyInstanceId]);

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

  const queueUpload = useCallback(
    (file: File) => {
      const uppy = uppyRef.current;
      if (!uppy || disabled) return;
      setUploadInProgress(true);
      setBusy(true);
      setError(null);
      try {
        uppy.cancelAll();
        void uppy.addFile({
          name: file.name,
          type: file.type,
          data: file,
        });
      } catch (e) {
        setUploadInProgress(false);
        setBusy(false);
        setError(e instanceof Error ? e.message : "Could not add file.");
      }
    },
    [disabled],
  );

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
    !dragActive && !disabled && !busy && "hover:ring-2 hover:ring-inset hover:ring-white/40",
  );

  const size = "detail";

  async function confirmRemoveImage() {
    setBusy(true);
    setError(null);
    try {
      const curId = fileIdTrim;
      if (curId && curId !== baselineIdTrim) {
        try {
          await deleteImageKitFile(curId);
        } catch (e) {
          console.warn(e);
        }
      }
      onImageUrlChange("");
      onIconFileIdChange("");
      onStagedUploadCleared?.();
      setRemoveConfirmOpen(false);
      setMenuOpen(false);
    } finally {
      setBusy(false);
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
            "focus-visible:ring-2 focus-visible:ring-offset-2",
            "focus-visible:ring-white/50 focus-visible:ring-inset focus-visible:ring-offset-0",
            ringHalo,
            isLocked && "opacity-75 grayscale",
          )}
          aria-label="Badge"
        >
        {busy ? (
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute isolate flex items-center justify-center rounded-none",
              "inset-[-10px]"
            )}
          >
            <div
              className={cn(
                "absolute inset-0 rounded-none opacity-[0.88] blur-[2.5px] will-change-transform animate-badge-upload-tide",
                "[background:conic-gradient(from_0deg_at_50%_50%,transparent_0deg,rgba(248,250,252,0.06)_55deg,rgba(255,255,255,0.42)_118deg,rgba(226,232,240,0.28)_168deg,rgba(248,250,252,0.08)_228deg,transparent_280deg,transparent_360deg)]",
                "opacity-[0.92]",
              )}
            />
            <div
              className={cn(
                "absolute rounded-none opacity-[0.92] will-change-transform animate-badge-upload-tide-slow",
                "inset-[5px]",
                "[mask-image:linear-gradient(to_bottom,transparent,#000_12%,#000_88%,transparent)]",
                "[background:conic-gradient(from_90deg_at_50%_50%,transparent_0deg,rgba(241,245,249,0.1)_52deg,rgba(252,252,253,0.88)_112deg,rgba(229,231,235,0.38)_162deg,rgba(248,250,252,0.12)_210deg,transparent_258deg,transparent_360deg)]",
              )}
            />
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
