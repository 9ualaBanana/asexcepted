"use client";

import { ensureBadgeImageDecoded } from "@/lib/badge/render-cache";
import { toOptimizedBadgeRenderSrc } from "@/lib/badge/render-src";
import { useImageKitImageUploader } from "@/lib/imagekit/use-imagekit-image-uploader";

const BADGE_MAX_FILE_BYTES = 15 * 1024 * 1024;

type UseBadgeImageUploaderOptions = {
  instanceId: string;
  disabled: boolean;
  onUploadSuccess: (url: string, fileId: string) => void;
  onUploadError: (message: string) => void;
  onUploadStart?: () => void;
  onUploadInProgressChange?: (inProgress: boolean) => void;
};

export function useBadgeImageUploader(options: UseBadgeImageUploaderOptions) {
  return useImageKitImageUploader({
    instanceId: options.instanceId,
    purpose: "badge",
    disabled: options.disabled,
    maxFileSizeBytes: BADGE_MAX_FILE_BYTES,
    defaultFileName: "badge",
    toRenderSrc: toOptimizedBadgeRenderSrc,
    onUploadSuccess: options.onUploadSuccess,
    onUploadError: options.onUploadError,
    onUploadStart: options.onUploadStart,
    onUploadInProgressChange: options.onUploadInProgressChange,
    afterUploadUrlReady: ensureBadgeImageDecoded,
  });
}
