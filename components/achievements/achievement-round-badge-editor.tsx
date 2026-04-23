"use client";

import Uppy from "@uppy/core";
import XHRUpload from "@uppy/xhr-upload";
import { ImagePlus, Trash2, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import type { AchievementTone } from "@/components/achievements/achievement-card";
import { AchievementFallbackBadge } from "@/components/achievements/achievement-fallback-badge";
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

type Surface = "overlay" | "form";

type AchievementRoundBadgeEditorProps = {
  instanceId: string;
  imageUrl: string;
  iconFileId: string;
  /** Saved badge file id at edit/create session start (empty when creating). */
  baselineIconFileId: string;
  tone: AchievementTone;
  isLocked: boolean;
  FallbackIcon: LucideIcon;
  /** Called after a successful ImageKit upload with the new URL + fileId. */
  onRemoteUploadCommit: (url: string, fileId: string) => void;
  onImageUrlChange: (url: string) => void;
  onIconFileIdChange: (fileId: string) => void;
  /** Clear staged-upload pointer when the in-progress image is removed locally. */
  onStagedUploadCleared?: () => void;
  /** Icon picker (button + dropdown) shown next to image actions when the badge menu is open. */
  menuAccessory?: ReactNode;
  disabled?: boolean;
  surface?: Surface;
};

export function AchievementRoundBadgeEditor({
  instanceId,
  imageUrl,
  iconFileId,
  baselineIconFileId,
  tone,
  isLocked,
  FallbackIcon,
  onRemoteUploadCommit,
  onImageUrlChange,
  onIconFileIdChange,
  onStagedUploadCleared,
  menuAccessory,
  disabled = false,
  surface = "form",
}: AchievementRoundBadgeEditorProps) {
  const uppyRef = useRef<Uppy | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const onRemoteCommitRef = useRef(onRemoteUploadCommit);
  const [menuOpen, setMenuOpen] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const removeTitleId = useId();

  onRemoteCommitRef.current = onRemoteUploadCommit;

  const trimmed = imageUrl.trim();
  const hasRemote = trimmed.length > 0;
  const fileIdTrim = iconFileId.trim();
  const baselineIdTrim = baselineIconFileId.trim();

  useEffect(() => {
    const uppy = new Uppy({
      id: `round-badge-${instanceId}`,
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
      setBusy(false);
    });

    uppy.on("upload-error", (_file, err) => {
      setBusy(false);
      setError(err?.message ?? "Upload failed.");
    });

    uppyRef.current = uppy;
    return () => {
      uppy.destroy();
      uppyRef.current = null;
    };
  }, [instanceId]);

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

  const ring =
    surface === "overlay"
      ? dragActive
        ? "ring-2 ring-white/50 ring-offset-2 ring-offset-zinc-950"
        : "ring-0 ring-offset-0"
      : dragActive
        ? "ring-2 ring-primary/60 ring-offset-2 ring-offset-background"
        : "ring-0";

  const isOverlay = surface === "overlay";

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
    <div ref={rootRef} className="relative flex flex-col items-center">
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

      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => !disabled && !busy && setMenuOpen((o) => !o)}
        onDragEnter={onDragOver}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          "relative flex h-40 w-40 shrink-0 cursor-pointer items-center justify-center rounded-full outline-none transition-shadow",
          "focus-visible:ring-2 focus-visible:ring-offset-2",
          isOverlay
            ? "focus-visible:ring-white/50 focus-visible:ring-offset-zinc-950"
            : "focus-visible:ring-ring focus-visible:ring-offset-background",
          ring,
          isLocked && "opacity-75 grayscale",
        )}
        aria-label="Badge"
      >
        {busy ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-[-14px] isolate flex items-center justify-center rounded-full"
          >
            {/* Soft outer tide — titanium-white glow, slow sweep */}
            <div
              className={cn(
                "absolute inset-0 rounded-full opacity-[0.88] blur-[2.5px] will-change-transform animate-badge-upload-tide",
                "[background:conic-gradient(from_0deg_at_50%_50%,transparent_0deg,rgba(248,250,252,0.06)_55deg,rgba(255,255,255,0.42)_118deg,rgba(226,232,240,0.28)_168deg,rgba(248,250,252,0.08)_228deg,transparent_280deg,transparent_360deg)]",
                isOverlay && "opacity-[0.92]",
              )}
            />
            {/* Crisp inner ring tide — counter-rotates for smooth interference */}
            <div
              className={cn(
                "absolute inset-[3px] rounded-full opacity-[0.92] will-change-transform animate-badge-upload-tide-slow",
                "[mask-image:radial-gradient(closest-side,transparent_70%,#000_71%,#000_86%,transparent_87%)]",
                "[background:conic-gradient(from_90deg_at_50%_50%,transparent_0deg,rgba(241,245,249,0.1)_52deg,rgba(252,252,253,0.88)_112deg,rgba(229,231,235,0.38)_162deg,rgba(248,250,252,0.12)_210deg,transparent_258deg,transparent_360deg)]",
              )}
            />
          </div>
        ) : null}
        {hasRemote ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={trimmed}
            alt=""
            className={cn(
              "h-full w-full rounded-full object-contain p-1 drop-shadow-lg transition-all duration-500 ease-out",
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
              size="overlay"
            />
          </div>
        )}
      </button>

      {menuOpen && !removeConfirmOpen ? (
        <div
          className="mt-3 flex flex-wrap items-center justify-center gap-3"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            disabled={disabled || busy}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-full border shadow-md transition",
              isOverlay
                ? "border-white/20 bg-white/10 text-white hover:bg-white/15"
                : "border-border bg-background hover:bg-muted",
            )}
            aria-label="Choose badge image"
            onClick={() => {
              fileInputRef.current?.click();
              setMenuOpen(false);
            }}
          >
            <ImagePlus className="h-5 w-5" />
          </button>
          {menuAccessory}
          {(hasRemote || fileIdTrim) && (
            <button
              type="button"
              disabled={disabled || busy}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full border shadow-md transition",
                isOverlay
                  ? "border-red-400/40 bg-red-500/15 text-red-100 hover:bg-red-500/25"
                  : "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15",
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
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-xl"
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
            isOverlay ? "text-red-300" : "text-destructive",
          )}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
