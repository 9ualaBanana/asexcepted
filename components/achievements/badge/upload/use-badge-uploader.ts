"use client";

import { Mutex } from "async-mutex";
import { useCallback, useEffect, useRef, useState } from "react";

import { useBadgeImageUploader } from "@/components/achievements/badge/upload/image/use-badge-image-uploader";
import {
  useBadgeModelUploader,
  type BadgeModelUploadStaged,
} from "@/components/achievements/badge/upload/model/use-badge-model-uploader";
import { type BadgeStorageRef } from "@/components/achievements/achievement-editor-shared";

type UseBadgeUploaderArgs = {
  instanceId: string;
  disabled: boolean;
  onImageUploadSuccess: (ref: BadgeStorageRef, url: string) => void;
  onModelUploadSuccess: (staged: BadgeModelUploadStaged) => void;
  onUploadError: (message: string) => void;
  onUploadStart?: () => void;
  onUploadInProgressChange?: (inProgress: boolean) => void;
};

export function useBadgeUploader({
  instanceId,
  disabled,
  onImageUploadSuccess,
  onModelUploadSuccess,
  onUploadError,
  onUploadStart,
  onUploadInProgressChange,
}: UseBadgeUploaderArgs) {
  const mutexRef = useRef(new Mutex());
  const releaseRef = useRef<(() => void) | null>(null);
  const [uploadInProgress, setUploadInProgress] = useState(false);

  const [imageUploadInProgress, setImageUploadInProgress] = useState(false);
  const [modelUploadInProgress, setModelUploadInProgress] = useState(false);
  const imageUploadInProgressRef = useRef(false);
  const modelUploadInProgressRef = useRef(false);

  useEffect(() => {
    imageUploadInProgressRef.current = imageUploadInProgress;
  }, [imageUploadInProgress]);

  useEffect(() => {
    modelUploadInProgressRef.current = modelUploadInProgress;
  }, [modelUploadInProgress]);

  const finishUpload = useCallback(() => {
    if (releaseRef.current) {
      releaseRef.current();
      releaseRef.current = null;
    }
    setUploadInProgress(false);
    onUploadInProgressChange?.(false);
  }, [onUploadInProgressChange]);

  const beginUpload = useCallback(async (): Promise<boolean> => {
    if (disabled || mutexRef.current.isLocked()) {
      return false;
    }
    const release = await mutexRef.current.acquire();
    releaseRef.current = release;
    setUploadInProgress(true);
    onUploadInProgressChange?.(true);
    onUploadStart?.();
    return true;
  }, [disabled, onUploadInProgressChange, onUploadStart]);

  const releaseIfNoTransferStarted = useCallback(() => {
    // If upload did not begin (e.g. uploader not ready), release immediately.
    window.setTimeout(() => {
      if (
        releaseRef.current &&
        !imageUploadInProgressRef.current &&
        !modelUploadInProgressRef.current
      ) {
        finishUpload();
      }
    }, 0);
  }, [finishUpload]);

  const imageUploader = useBadgeImageUploader({
    instanceId,
    disabled,
    onUploadSuccess: (url, fileId) => {
      onImageUploadSuccess(
        {
          iconFileId: fileId,
          modelAssetPath: "",
        },
        url,
      );
      finishUpload();
    },
    onUploadError: (message) => {
      onUploadError(message);
      finishUpload();
    },
    onUploadInProgressChange: setImageUploadInProgress,
  });

  const modelUploader = useBadgeModelUploader({
    disabled,
    onUploadSuccess: (staged) => {
      onModelUploadSuccess(staged);
      finishUpload();
    },
    onUploadError: (message) => {
      onUploadError(message);
      finishUpload();
    },
    onUploadInProgressChange: setModelUploadInProgress,
  });

  const queueUpload = useCallback(
    async (file: File) => {
      const started = await beginUpload();
      if (!started) return;

      const isModelUpload =
        file.name.toLowerCase().endsWith(".glb") ||
        file.type === "model/gltf-binary";

      try {
        if (isModelUpload) {
          await modelUploader.queueUpload(file);
        } else {
          await imageUploader.queueUpload(file);
        }
      } catch (error) {
        onUploadError(
          error instanceof Error
            ? error.message
            : isModelUpload
              ? "Could not upload 3D badge asset."
              : "Could not upload badge image.",
        );
        finishUpload();
        return;
      }

      releaseIfNoTransferStarted();
    },
    [
      beginUpload,
      finishUpload,
      imageUploader,
      modelUploader,
      onUploadError,
      releaseIfNoTransferStarted,
    ],
  );

  return {
    queueUpload,
    uploadInProgress,
  };
}
