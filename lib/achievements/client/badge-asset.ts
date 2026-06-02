import { err, ok, type Result } from "neverthrow";

import type { BadgeRemoteAsset } from "@/components/achievements/achievement-editor-shared";
import { badgeRemoteAssetDeletePayload } from "@/lib/achievements/badge/shared/badge-model-asset";
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

export async function deleteBadgeRemoteAsset(asset: BadgeRemoteAsset): Promise<Result<void, string>> {
  const result = await deleteBadgeRemoteAssetViaApi(badgeRemoteAssetDeletePayload(asset));
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
