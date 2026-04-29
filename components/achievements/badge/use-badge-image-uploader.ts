"use client";

import Uppy from "@uppy/core";
import XHRUpload from "@uppy/xhr-upload";
import { useCallback, useEffect, useRef, useState } from "react";

import { getImageKitUploadAuth } from "@/lib/imagekit-client";

const IMAGEKIT_UPLOAD_ENDPOINT = "https://upload.imagekit.io/api/v1/files/upload";

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

type UseBadgeImageUploaderOptions = {
  instanceId: string;
  disabled: boolean;
  onUploadSuccess: (url: string, fileId: string) => void;
  onUploadError: (message: string) => void;
  onUploadStart?: () => void;
  onUploadInProgressChange?: (inProgress: boolean) => void;
};

async function waitUntilImageFetchable(url: string): Promise<void> {
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
}

export function useBadgeImageUploader({
  instanceId,
  disabled,
  onUploadSuccess,
  onUploadError,
  onUploadStart,
  onUploadInProgressChange,
}: UseBadgeImageUploaderOptions) {
  const uppyRef = useRef<Uppy | null>(null);
  const onUploadSuccessRef = useRef(onUploadSuccess);
  const onUploadErrorRef = useRef(onUploadError);
  const onUploadStartRef = useRef(onUploadStart);
  const [uploadInProgress, setUploadInProgress] = useState(false);

  onUploadSuccessRef.current = onUploadSuccess;
  onUploadErrorRef.current = onUploadError;
  onUploadStartRef.current = onUploadStart;

  useEffect(() => {
    onUploadInProgressChange?.(uploadInProgress);
  }, [onUploadInProgressChange, uploadInProgress]);

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
        const safeName = file?.name?.replace(/[^\w.\-]+/g, "_").slice(0, 120) || "badge";
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
        onUploadErrorRef.current("Upload finished without a URL.");
        setUploadInProgress(false);
        return;
      }

      try {
        await waitUntilImageFetchable(url);
      } catch {
        // no-op: commit anyway
      }

      onUploadSuccessRef.current(url, newFileId);
      uppy.cancelAll();
      setUploadInProgress(false);
    });

    uppy.on("upload-error", (_file, err) => {
      setUploadInProgress(false);
      onUploadErrorRef.current(err?.message ?? "Upload failed.");
    });

    uppyRef.current = uppy;
    return () => {
      uppy.destroy();
      uppyRef.current = null;
    };
  }, [instanceId]);

  const queueUpload = useCallback(
    (file: File) => {
      const uppy = uppyRef.current;
      if (!uppy || disabled) return;
      setUploadInProgress(true);
      onUploadStartRef.current?.();
      try {
        uppy.cancelAll();
        void uppy.addFile({
          name: file.name,
          type: file.type,
          data: file,
        });
      } catch (e) {
        setUploadInProgress(false);
        onUploadErrorRef.current(
          e instanceof Error ? e.message : "Could not add file.",
        );
      }
    },
    [disabled],
  );

  return { queueUpload, uploadInProgress };
}
