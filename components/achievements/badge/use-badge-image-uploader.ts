"use client";

import Uppy from "@uppy/core";
import XHRUpload from "@uppy/xhr-upload";
import { useCallback, useEffect, useRef, useState } from "react";

import { ensureBadgeImageDecoded } from "@/lib/badge/render-cache";
import { getImageKitUploadAuth } from "@/lib/imagekit-client";
import { logImageKitEvent } from "@/lib/imagekit/telemetry";
import { toOptimizedBadgeRenderSrc } from "@/lib/badge/render-src";

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

async function waitUntilImageFetchable(url: string): Promise<boolean> {
  const started = Date.now();
  let ok = false;
  await new Promise<void>((resolve) => {
    const img = new Image();
    let settled = false;
    const done = (success: boolean) => {
      if (settled) return;
      settled = true;
      ok = success;
      resolve();
    };
    img.onload = () => done(true);
    img.onerror = () => done(false);
    img.src = `${url}${url.includes("?") ? "&" : "?"}ready=${Date.now()}`;
    setTimeout(() => done(img.complete), 4000);
  });
  logImageKitEvent({
    op: "upload_probe",
    ok,
    durationMs: Date.now() - started,
    srcHost: (() => {
      try {
        return new URL(url).hostname;
      } catch {
        return undefined;
      }
    })(),
  });
  return ok;
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
  const uploadStartedAtRef = useRef<number | null>(null);
  const uploadFileBytesRef = useRef<number | undefined>(undefined);
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

    uppy.on("upload", () => {
      uploadStartedAtRef.current = Date.now();
    });

    uppy.on("upload-success", async (file, response) => {
      const body = response.body as { url?: string; fileId?: string } | undefined;
      const url =
        typeof response.uploadURL === "string"
          ? response.uploadURL
          : typeof body?.url === "string"
            ? body.url
            : null;
      const newFileId = typeof body?.fileId === "string" ? body.fileId : "";
      const startedAt = uploadStartedAtRef.current;
      const fileBytes =
        uploadFileBytesRef.current ??
        (file?.data instanceof Blob ? file.data.size : undefined);

      if (!url) {
        logImageKitEvent({
          op: "client_upload",
          ok: false,
          durationMs: startedAt != null ? Date.now() - startedAt : undefined,
          fileBytes,
          message: "missing_url",
        });
        onUploadErrorRef.current("Upload finished without a URL.");
        setUploadInProgress(false);
        return;
      }

      logImageKitEvent({
        op: "client_upload",
        ok: true,
        durationMs: startedAt != null ? Date.now() - startedAt : undefined,
        fileBytes,
      });

      const renderSrc = toOptimizedBadgeRenderSrc(url);
      try {
        await waitUntilImageFetchable(renderSrc);
        await ensureBadgeImageDecoded(renderSrc);
      } catch {
        // no-op: commit anyway
      }

      onUploadSuccessRef.current(url, newFileId);
      uppy.cancelAll();
      setUploadInProgress(false);
      uploadStartedAtRef.current = null;
      uploadFileBytesRef.current = undefined;
    });

    uppy.on("upload-error", (_file, err) => {
      const startedAt = uploadStartedAtRef.current;
      logImageKitEvent({
        op: "client_upload",
        ok: false,
        durationMs: startedAt != null ? Date.now() - startedAt : undefined,
        fileBytes: uploadFileBytesRef.current,
        message: err?.message ?? "upload_error",
      });
      setUploadInProgress(false);
      uploadStartedAtRef.current = null;
      uploadFileBytesRef.current = undefined;
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
      uploadFileBytesRef.current = file.size;
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
        uploadFileBytesRef.current = undefined;
        onUploadErrorRef.current(
          e instanceof Error ? e.message : "Could not add file.",
        );
      }
    },
    [disabled],
  );

  return { queueUpload, uploadInProgress };
}
