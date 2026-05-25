"use client";

import { ImagePlus, UserRound } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { toOptimizedAvatarRenderSrc } from "@/lib/profile/avatar-render-src";
import {
  PROFILE_AVATAR_MAX_EDGE_PX,
  PROFILE_AVATAR_MAX_FILE_BYTES,
} from "@/lib/profile/avatar-limits";
import { useImageKitImageUploader } from "@/lib/imagekit/use-imagekit-image-uploader";
import { useErrorToast } from "@/lib/toast";

import "@uppy/core/css/style.min.css";

export type ProfileAvatarSlotLayout = "profile" | "feed-overlay";

type ProfileAvatarSlotProps = {
  imageUrl?: string | null;
  layout?: ProfileAvatarSlotLayout;
  editable?: boolean;
  disabled?: boolean;
  className?: string;
  onUploadSuccess?: (url: string, fileId: string) => void;
  onUploadError?: (message: string) => void;
  onUploadInProgressChange?: (inProgress: boolean) => void;
};

const layoutClass: Record<ProfileAvatarSlotLayout, string> = {
  profile: "h-28 w-28 sm:h-32 sm:w-32",
  /** Sized by parent in feed rows (explicit px wrapper). */
  "feed-overlay": "h-full w-full min-h-[1.375rem] min-w-[1.375rem]",
};

export function ProfileAvatarSlot({
  imageUrl,
  layout = "profile",
  editable = false,
  disabled = false,
  className,
  onUploadSuccess,
  onUploadError,
  onUploadInProgressChange,
}: ProfileAvatarSlotProps) {
  const uppyInstanceId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const onUploadSuccessRef = useRef(onUploadSuccess);
  const [armed, setArmed] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useErrorToast(error, { id: "profile-avatar-upload" });

  onUploadSuccessRef.current = onUploadSuccess;

  const trimmed = imageUrl?.trim() ?? "";
  const hasImage = trimmed.length > 0;
  const displaySrc = hasImage ? toOptimizedAvatarRenderSrc(trimmed) : null;

  const { queueUpload, uploadInProgress } = useImageKitImageUploader({
    instanceId: uppyInstanceId,
    purpose: "avatar",
    disabled: disabled || !editable,
    maxFileSizeBytes: PROFILE_AVATAR_MAX_FILE_BYTES,
    maxEdgePx: PROFILE_AVATAR_MAX_EDGE_PX,
    defaultFileName: "avatar",
    toRenderSrc: toOptimizedAvatarRenderSrc,
    onUploadSuccess: (url, fileId) => {
      setError(null);
      onUploadSuccessRef.current?.(url, fileId);
      setArmed(false);
    },
    onUploadError: (message) => {
      setError(message);
      onUploadError?.(message);
    },
    onUploadStart: () => setError(null),
    onUploadInProgressChange,
  });

  const busy = uploadInProgress;

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
    setArmed(false);
  }, []);

  useEffect(() => {
    if (!editable || !armed) return;
    function onDocPointerDown(e: PointerEvent) {
      const root = rootRef.current;
      if (root && !root.contains(e.target as Node)) {
        setArmed(false);
      }
    }
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [armed, editable]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      if (!editable) return;
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      const f = e.dataTransfer.files?.[0];
      if (f?.type.startsWith("image/")) void queueUpload(f);
    },
    [editable, queueUpload],
  );

  const onDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!editable || disabled || busy) return;
      e.preventDefault();
      e.stopPropagation();
      setDragActive(true);
    },
    [busy, disabled, editable],
  );

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  function handleCirclePress() {
    if (!editable || disabled || busy) return;
    if (armed) {
      openFilePicker();
      return;
    }
    setArmed(true);
  }

  const circle = (
    <div
      className={cn(
        "relative flex h-full w-full shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-zinc-900/90 shadow-sm",
        editable && !disabled && "cursor-pointer",
        dragActive && editable && "ring-2 ring-inset ring-white/40",
        layout === "feed-overlay" && "ring-2 ring-background",
      )}
    >
      {displaySrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={displaySrc}
          alt=""
          className={cn(
            "max-h-full max-w-full object-contain object-center",
            busy && "scale-[0.97] opacity-70 blur-[2px]",
          )}
          draggable={false}
        />
      ) : (
        <UserRound
          className={cn(
            "text-muted-foreground/85",
            layout === "feed-overlay" ? "h-[58%] w-[58%]" : "h-12 w-12 sm:h-14 sm:w-14",
            busy && "opacity-60",
          )}
          aria-hidden
        />
      )}

      {editable && armed && !busy ? (
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/45"
          aria-hidden
        >
          <ImagePlus className="h-7 w-7 text-white/90 sm:h-8 sm:w-8" />
        </div>
      ) : null}

      {busy ? (
        <div
          className="pointer-events-none absolute inset-0 rounded-full bg-black/35"
          aria-hidden
        />
      ) : null}
    </div>
  );

  const shellClass = cn(
    "relative shrink-0",
    layoutClass[layout],
    className,
  );

  if (!editable) {
    return (
      <div className={shellClass} aria-hidden>
        {circle}
      </div>
    );
  }

  return (
    <div ref={rootRef} className={cn("flex flex-col items-center", shellClass)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void queueUpload(f);
        }}
      />

      <button
        type="button"
        disabled={disabled || busy}
        onClick={handleCirclePress}
        onDragEnter={onDragOver}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          "relative h-full w-full rounded-full p-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          armed && !busy && "ring-2 ring-white/25 ring-offset-2 ring-offset-background",
        )}
        aria-label={
          armed ? "Choose profile photo" : "Profile picture"
        }
      >
        {circle}
      </button>
    </div>
  );
}
