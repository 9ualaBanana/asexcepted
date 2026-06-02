import { err, ok, type Result } from "neverthrow";

import type { BadgeStorageRef } from "@/components/achievements/achievement-editor-shared";
import { badgeStorageRefDeletePayload } from "@/lib/achievements/badge/shared/badge-model-asset";
import {
  deleteBadgeRemoteAssetViaApi,
  requestSignedBadgeModelUrl,
} from "@/lib/achievements/client/badge-asset-api";
import { fetchFailureMessage } from "@/lib/client/fetch-json";

export {
  finalizeBadgeModelUpload,
  uploadBadgeModelAsset,
  uploadBadgeModelGlbOnly,
} from "@/lib/achievements/client/badge-model-upload";
export type { BadgeModelUploadSuccess } from "@/lib/achievements/client/badge-asset-api";

export async function deleteBadgeRemoteAsset(ref: BadgeStorageRef): Promise<Result<void, string>> {
  const result = await deleteBadgeRemoteAssetViaApi(badgeStorageRefDeletePayload(ref));
  if (result.isErr()) {
    return err(fetchFailureMessage(result.error));
  }
  return ok(undefined);
}

export async function fetchSignedBadgeModelUrl(assetPath: string): Promise<Result<string, string>> {
  const result = await requestSignedBadgeModelUrl(assetPath);
  if (result.isErr()) {
    return err(fetchFailureMessage(result.error));
  }
  return ok(result.value.signedUrl);
}
