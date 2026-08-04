import { err, ok, type Result } from "neverthrow";

import { BADGE_MODEL_BUCKET } from "@/lib/achievements/badge/shared/badge-assets";
import {
  completeBadgeModelUpload,
  requestBadgeModelUploadTarget,
  type BadgeModelUploadSuccess,
} from "@/lib/achievements/client/badge-asset-api";
import { fetchFailureMessage } from "@/lib/client/fetch-json";
import { createBrowserSupabase } from "@/lib/supabase/clients/browser";

async function uploadBadgeModelToSignedUrl(
  target: { modelPath: string; token: string },
  model: File,
): Promise<Result<void, string>> {
  const supabase = createBrowserSupabase();
  const { error } = await supabase.storage
    .from(BADGE_MODEL_BUCKET)
    .uploadToSignedUrl(target.modelPath, target.token, model, {
      contentType: "model/gltf-binary",
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    return err(error.message);
  }
  return ok(undefined);
}

export async function uploadBadgeModelGlbOnly(
  model: File,
): Promise<Result<{ modelPath: string }, string>> {
  const targetResult = await requestBadgeModelUploadTarget();
  if (targetResult.isErr()) {
    return err(fetchFailureMessage(targetResult.error));
  }

  const uploadResult = await uploadBadgeModelToSignedUrl(targetResult.value, model);
  if (uploadResult.isErr()) {
    return err(uploadResult.error);
  }

  return ok({ modelPath: targetResult.value.modelPath });
}

export async function finalizeBadgeModelUpload(args: {
  modelPath: string;
  poster: Blob;
}): Promise<Result<BadgeModelUploadSuccess, string>> {
  const completeResult = await completeBadgeModelUpload(args.modelPath, args.poster);
  if (completeResult.isErr()) {
    return err(fetchFailureMessage(completeResult.error));
  }
  return ok(completeResult.value);
}

export async function uploadBadgeModelAsset(
  model: File,
  poster: Blob,
): Promise<Result<BadgeModelUploadSuccess, string>> {
  const glbResult = await uploadBadgeModelGlbOnly(model);
  if (glbResult.isErr()) {
    return err(glbResult.error);
  }
  return finalizeBadgeModelUpload({ modelPath: glbResult.value.modelPath, poster });
}
