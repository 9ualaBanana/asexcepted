"use client";

import { useCallback, useState } from "react";

import { prepareBadgeModelUpload } from "@/components/achievements/badge/badge-model-upload-client";
import { uploadAchievementBadgeModelAsset } from "@/lib/badge-asset-client";

type UploadedModelAsset = {
  iconUrl: string;
  iconAssetKind: "model_glb";
  iconAssetPath: string;
};

type UseBadgeModelUploaderOptions = {
  disabled: boolean;
  onUploadSuccess: (asset: UploadedModelAsset) => void;
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
        const uploaded = await uploadAchievementBadgeModelAsset(file, prepared.previewBlob);
        options.onUploadSuccess(uploaded);
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
