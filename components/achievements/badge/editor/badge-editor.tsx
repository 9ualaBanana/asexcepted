"use client";

import { Box, ImagePlus, Lock, Pause, Play, Trash2, Unlock } from "lucide-react";
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
} from "@/components/achievements/achievement-manager-utils";
import { BadgeSlot } from "@/components/achievements/badge/chrome/badge-slot";
import { BadgeAttributionPopover } from "@/components/achievements/badge/chrome/badge-attribution-popover";
import { FallbackBadge } from "@/components/achievements/badge/display/fallback-badge";
import { RemoteBadgeImage } from "@/components/achievements/badge/display/remote-badge-image";
import {
  deleteBadgeStorageRefQuietly,
  getReplacedBadgeStorageRef,
} from "@/components/achievements/badge/upload/badge-asset-session";
import {
  type BadgeStorageRef,
  type AchievementIconKey,
  iconMap,
} from "@/components/achievements/achievement-editor-shared";
import { Button } from "@/components/ui/button";
import { useErrorToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { BadgeGltfViewer, useSignedBadgeModelUrl } from "@/components/achievements/badge/model";
import type { BadgeModelUploadStaged } from "@/components/achievements/badge/upload/model/use-badge-model-uploader";
import { useBadgeUploader } from "../upload/use-badge-uploader";

import "@uppy/core/css/style.min.css";
import {
  patchBadgeModelAsset,
  type BadgeModelAsset,
} from "@/lib/achievements/badge/shared/badge-model-asset";

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

type BadgeEditorProps = {
  imageUrl: string;
  /** `toOptimizedRenderUrl(imageUrl)` from the editor parent — do not re-optimize here. */
  renderSrc: string | null;
  iconFileId: string;
  /** Parsed GLB badge fields; null for flat image badges. */
  model: BadgeModelAsset | null;
  baselineRef: BadgeStorageRef;
  tone: AchievementTone;
  isLocked: boolean;
  icon: AchievementIconKey;
  onToneChange: (tone: AchievementTone) => void;
  onToggleLocked: () => void;
  canToggleLocked?: boolean;
  onIconChange: (icon: AchievementIconKey) => void;
  /** Called after a successful remote upload with the resolved badge preview + asset metadata. */
  onUploadStorageCommit: (ref: BadgeStorageRef) => void;
  onImageUrlChange: (url: string) => void;
  onIconFileIdChange: (fileId: string) => void;
  onModelChange: (model: BadgeModelAsset | null) => void;
  allowModelRotation?: boolean;
  /** Clear staged-upload pointer when the in-progress image is removed locally. */
  onStagedUploadCleared?: () => void;
  /** Signals when remote badge upload is currently in flight. */
  onUploadInProgressChange?: (inProgress: boolean) => void;
  onModelUploadStaged?: (staged: BadgeModelUploadStaged) => void;
  disabled?: boolean;
};

export function BadgeEditor({
  imageUrl,
  renderSrc,
  iconFileId,
  model,
  baselineRef,
  tone,
  isLocked,
  icon,
  onToneChange,
  onToggleLocked,
  canToggleLocked = true,
  onIconChange,
  onUploadStorageCommit,
  onImageUrlChange,
  onIconFileIdChange,
  onModelChange,
  allowModelRotation = true,
  onStagedUploadCleared,
  onUploadInProgressChange,
  onModelUploadStaged,
  disabled = false,
}: BadgeEditorProps) {
  const uppyInstanceId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const tonePickerRef = useRef<HTMLDivElement>(null);
  const iconPickerRef = useRef<HTMLDivElement>(null);
  const onUploadStorageCommitRef = useRef(onUploadStorageCommit);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toneMenuOpen, setToneMenuOpen] = useState(false);
  const [iconMenuOpen, setIconMenuOpen] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasModelAnimation, setHasModelAnimation] = useState(false);

  const removeTitleId = useId();
  const FallbackIcon = iconMap[icon];

  onUploadStorageCommitRef.current = onUploadStorageCommit;

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
  const currentStorageRef: BadgeStorageRef = {
    iconFileId: iconFileId.trim(),
    modelAssetPath: model?.assetPath ?? "",
  };
  const hasCustomBadge =
    hasRemote ||
    currentStorageRef.iconFileId.length > 0 ||
    currentStorageRef.modelAssetPath.length > 0;
  const isModelAsset = model !== null;

  const patchModel = useCallback(
    (patch: Partial<BadgeModelAsset>) => {
      if (!model) return;
      onModelChange(patchBadgeModelAsset(model, patch));
    },
    [model, onModelChange],
  );

  const { signedUrl: editorSignedModelUrl } = useSignedBadgeModelUrl(
    model?.assetPath ?? "",
    isModelAsset,
  );

  useEffect(() => {
    if (!isModelAsset) {
      setHasModelAnimation(false);
    }
  }, [isModelAsset]);

  useErrorToast(error, { id: "badge-editor-upload" });

  const { queueUpload, uploadInProgress } = useBadgeUploader({
    instanceId: uppyInstanceId,
    disabled,
    onImageUploadSuccess: (ref, url) => {
      setError(null);
      onImageUrlChange(url);
      onIconFileIdChange(ref.iconFileId);
      onModelChange(null);
      onUploadStorageCommitRef.current(ref);
      setMenuOpen(false);
    },
    onModelUploadSuccess: (staged) => {
      setError(null);
      onModelUploadStaged?.(staged);
      setMenuOpen(false);
    },
    onUploadError: (message) => {
      setError(message);
    },
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
      if (!f) return;
      void queueUpload(f);
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

  async function confirmRemoveAsset() {
    setIsRemoving(true);
    setError(null);
    try {
      const stagedRefToDelete = getReplacedBadgeStorageRef(
        currentStorageRef,
        baselineRef,
      );
      await deleteBadgeStorageRefQuietly(stagedRefToDelete, (e) => console.warn(e));
      onImageUrlChange("");
      onIconFileIdChange("");
      onModelChange(null);
      onStagedUploadCleared?.();
      setRemoveConfirmOpen(false);
      setMenuOpen(false);
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <div ref={rootRef} className="group/badge relative flex flex-col items-center">
      {model ? (
        <button
          type="button"
          aria-label={
            model.animationPlay
              ? "Pause and reset model animation"
              : "Play model animation from start"
          }
          disabled={disabled || busy || !hasModelAnimation}
          onClick={(event) => {
            event.stopPropagation();
            patchModel({ animationPlay: !model.animationPlay });
          }}
          className="pointer-events-auto absolute left-3 top-3 z-40 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/10 text-white/25 shadow-md backdrop-blur-sm transition hover:bg-black/20 hover:text-white/45 disabled:pointer-events-none disabled:opacity-50"
        >
          {model.animationPlay ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
        </button>
      ) : null}
      {model?.animationPlay && hasModelAnimation ? (
        <div className="pointer-events-none absolute left-12 right-12 top-3 z-40 flex items-center">
          <input
            type="range"
            min={0.1}
            max={2}
            step={0.05}
            value={model.animationSpeed}
            disabled={disabled || busy}
            aria-label="Animation speed"
            className="pointer-events-auto h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/25 accent-white disabled:cursor-not-allowed disabled:opacity-40"
            onChange={(event) => {
              const value = Number(event.target.value);
              if (!Number.isFinite(value)) return;
              patchModel({ animationSpeed: value });
            }}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      ) : null}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) {
            void queueUpload(f);
          }
        }}
      />
      <input
        ref={modelInputRef}
        type="file"
        accept=".glb,model/gltf-binary,application/octet-stream"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) {
            void queueUpload(f);
          }
        }}
      />

      <BadgeSlot size={size}>
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
              /* Inset keeps bloom/orbit motion off the badge slot edges (was inset-[-10px]). */
              "inset-[11%]"
            )}
          >
            <div className="badge-upload-bloom absolute inset-0 rounded-full" />
            <div className="badge-upload-blob badge-upload-blob-a absolute h-[68%] w-[68%] rounded-full" />
            <div className="badge-upload-blob badge-upload-blob-b absolute h-[56%] w-[56%] rounded-full" />
            <div className="badge-upload-blob badge-upload-blob-c absolute h-[48%] w-[48%] rounded-full" />
          </div>
        ) : null}
        {hasRemote && renderSrc ? (
          model && editorSignedModelUrl ? (
            <BadgeGltfViewer
              model={model}
              signedModelUrl={editorSignedModelUrl}
              renderSrc={renderSrc}
              className={cn("p-1", busy && "scale-[0.96] blur-[3.5px] opacity-[0.72]")}
              float={false}
              motionSeed={model.assetPath || trimmed}
              onHasAnimationChange={setHasModelAnimation}
              onPoseChange={(yaw, pitch) => patchModel({ yaw, pitch })}
              allowInertia={false}
              interactive={allowModelRotation}
            />
          ) : (
            <RemoteBadgeImage
              src={renderSrc}
              className={cn(
                "p-1 transition-all duration-500 ease-out",
                "h-full w-full object-contain drop-shadow-lg",
                busy && "scale-[0.96] blur-[3.5px] opacity-[0.72]",
              )}
            />
          )
        ) : (
          <div
            className={cn(
              "h-full w-full transition-all duration-500 ease-out",
              busy && "scale-[0.96] blur-[3.5px] opacity-[0.72]",
            )}
          >
            <FallbackBadge
              tone={tone}
              isLocked={isLocked}
              FallbackIcon={FallbackIcon}
              size={size}
            />
          </div>
        )}
        </button>
        {model != null && (
          <BadgeAttributionPopover
            value={model.ccAttribution ?? ""}
            editable
            onChange={(value) => patchModel({ ccAttribution: value })}
            disabled={disabled || busy}
            emptyState="Add creator credit, license, source link, or any required attribution."
          />
        )}
        {canToggleLocked ? (
          <div className="group/lock pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
            <button
              type="button"
              aria-label={isLocked ? "Set unlocked" : "Set locked"}
              disabled={disabled || busy}
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
        ) : null}
        {menuOpen && !removeConfirmOpen ? (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex justify-center bg-gradient-to-t from-[#14121c]/96 via-[#14121c]/72 to-transparent px-2 pb-2.5 pt-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-2 sm:gap-2.5">
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
          <button
            type="button"
            disabled={disabled || busy}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full border shadow-md transition sm:h-11 sm:w-11",
              "border-white/20 bg-white/10 text-white hover:bg-white/15",
            )}
            aria-label="Choose 3D badge model"
            onClick={() => {
              modelInputRef.current?.click();
              setMenuOpen(false);
            }}
          >
            <Box className="h-5 w-5" />
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
                  <div className="absolute bottom-full left-1/2 z-50 mb-2 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-nowrap items-center gap-1.5 overflow-x-auto rounded-2xl border bg-background/95 p-2 shadow-lg backdrop-blur-sm [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:gap-2">
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
                  <div className="absolute bottom-full left-1/2 z-50 mb-2 grid w-64 max-w-[calc(100vw-2rem)] -translate-x-1/2 grid-cols-6 gap-1.5 rounded-2xl border bg-background/95 p-2 shadow-lg backdrop-blur-sm sm:gap-2">
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
          </div>
        ) : null}
      </BadgeSlot>

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
              Remove badge asset?
            </h2>
            <p className="mt-2 text-sm text-white/55">
              The preview will fall back to your selected icon. The stored image
              or 3D asset is removed when you save, or immediately if it was
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
                onClick={() => void confirmRemoveAsset()}
              >
                {busy ? "Removing…" : "Remove"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}
