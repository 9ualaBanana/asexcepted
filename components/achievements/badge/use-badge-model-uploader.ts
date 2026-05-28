"use client";

import { useCallback, useState } from "react";

import {
  revokeBadgeModelPoseSession,
  type BadgeModelPoseSession,
} from "@/components/achievements/badge/badge-model-pose-session";
import { prepareBadgeModelUpload } from "@/components/achievements/badge/badge-model-upload-client";
import type { FormState } from "@/components/achievements/achievement-editor-shared";
import { uploadBadgeModelGlbOnly } from "@/lib/badge-asset-client";

export type BadgeModelUploadStaged = {
  modelPath: string;
  poseSession: BadgeModelPoseSession;
  previewUrl: string;
  iconModelYaw: number;
  iconModelPitch: number;
};

type UseBadgeModelUploaderOptions = {
  disabled: boolean;
  onUploadSuccess: (staged: BadgeModelUploadStaged) => void;
  onUploadError: (message: string) => void;
  onUploadStart?: () => void;
  onUploadInProgressChange?: (inProgress: boolean) => void;
};

export function useBadgeModelUploader(options: UseBadgeModelUploaderOptions) {
  const [uploadInProgress, setUploadInProgress] = useState(false);

  const setInProgress = useCallback(
    (next: boolean) => {
      setUploadInProgress(next);
      options.onUploadInProgressChange?.(next);
    },
    [options],
  );

  const queueUpload = useCallback(
    async (file: File) => {
      if (options.disabled || uploadInProgress) return;

      setInProgress(true);
      options.onUploadStart?.();
      try {
        const prepared = await prepareBadgeModelUpload(file);
        const { modelPath } = await uploadBadgeModelGlbOnly(file);

        const poseSession: BadgeModelPoseSession = {
          modelPath,
          initialPreviewUrl: prepared.initialPreviewUrl,
          createPreviewBlob: prepared.createPreviewBlob,
          finalized: false,
        };

        options.onUploadSuccess({
          modelPath,
          poseSession,
          previewUrl: prepared.initialPreviewUrl,
          iconModelYaw: prepared.initialYaw,
          iconModelPitch: prepared.initialPitch,
        });
      } catch (error) {
        options.onUploadError(
          error instanceof Error ? error.message : "Could not upload 3D badge asset.",
        );
      } finally {
        setInProgress(false);
      }
    },
    [options, setInProgress, uploadInProgress],
  );

  return {
    queueUpload,
    uploadInProgress,
  };
}

export function applyBadgeModelPoseSessionToForm(
  form: FormState,
  staged: BadgeModelUploadStaged,
): FormState {
  return {
    ...form,
    iconUrl: staged.previewUrl,
    iconFileId: "",
    iconAssetKind: "model_glb",
    iconAssetPath: staged.modelPath,
    iconModelYaw: staged.iconModelYaw,
    iconModelPitch: staged.iconModelPitch,
  };
}

export function clearBadgeModelPoseSessionRef(
  sessionRef: { current: BadgeModelPoseSession | null },
): void {
  revokeBadgeModelPoseSession(sessionRef.current);
  sessionRef.current = null;
}
