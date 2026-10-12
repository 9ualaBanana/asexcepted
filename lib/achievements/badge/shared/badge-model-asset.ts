import type { FormState } from "@/lib/achievements/presentation/form-state";
import type { IconAssetKind } from "@/lib/achievements/domain/enums";

import { sanitizeBadgeAssetPath } from "./badge-assets";

export const BADGE_MODEL_ASSET_KIND = "model_glb" as const;

export type BadgeModelAssetKind = typeof BADGE_MODEL_ASSET_KIND;

/** Persisted GLB badge: storage path, pose, and animation. */
export type BadgeModelAsset = {
  assetPath: string;
  yaw: number;
  pitch: number;
  animationPlay: boolean;
  animationSpeed: number;
};

/** DB rows, view models, and forms may use camelCase or legacy `icon*` field names. */
export type BadgeModelAssetFields = {
  assetKind?: IconAssetKind | string | null;
  iconAssetKind?: IconAssetKind | string | null;
  assetPath?: string | null;
  iconAssetPath?: string | null;
  yaw?: number | null;
  iconModelYaw?: number | null;
  pitch?: number | null;
  iconModelPitch?: number | null;
  animationPlay?: boolean | null;
  iconModelAnimationPlay?: boolean | null;
  animationSpeed?: number | null;
  iconModelAnimationSpeed?: number | null;
};

export function isModelBadgeAssetKind(
  value: IconAssetKind | string | null | undefined,
): boolean {
  return value === BADGE_MODEL_ASSET_KIND;
}

function readAssetKind(fields: BadgeModelAssetFields): IconAssetKind | string | null | undefined {
  return fields.assetKind ?? fields.iconAssetKind;
}

function readAssetPath(fields: BadgeModelAssetFields): string | null | undefined {
  return fields.assetPath ?? fields.iconAssetPath;
}

function isParsedBadgeModelAsset(value: unknown): value is BadgeModelAsset {
  return (
    typeof value === "object" &&
    value !== null &&
    "assetPath" in value &&
    "animationPlay" in value
  );
}

/** True when the record points at an uploaded GLB (kind + non-empty storage path). */
export function isModelGlbAsset(
  assetKind: IconAssetKind | string | null | undefined,
  assetPath: string | null | undefined,
): boolean;
export function isModelGlbAsset(fields: BadgeModelAssetFields): boolean;
export function isModelGlbAsset(model: BadgeModelAsset | null | undefined): boolean;
export function isModelGlbAsset(
  assetKindOrFields:
    | IconAssetKind
    | string
    | null
    | undefined
    | BadgeModelAssetFields
    | BadgeModelAsset
    | null,
  assetPath?: string | null | undefined,
): boolean {
  if (isParsedBadgeModelAsset(assetKindOrFields)) {
    return Boolean(sanitizeBadgeAssetPath(assetKindOrFields.assetPath));
  }
  if (assetKindOrFields !== null && typeof assetKindOrFields === "object") {
    const fields = assetKindOrFields as BadgeModelAssetFields;
    return (
      isModelBadgeAssetKind(readAssetKind(fields)) &&
      Boolean(sanitizeBadgeAssetPath(readAssetPath(fields)))
    );
  }
  return (
    isModelBadgeAssetKind(assetKindOrFields as string) &&
    Boolean(sanitizeBadgeAssetPath(assetPath))
  );
}

export function parseBadgeModelAsset(
  fields: BadgeModelAssetFields,
): BadgeModelAsset | null {
  if (!isModelGlbAsset(fields)) return null;

  const assetPath = sanitizeBadgeAssetPath(readAssetPath(fields));
  if (!assetPath) return null;

  const animationSpeedRaw = fields.animationSpeed ?? fields.iconModelAnimationSpeed;
  const animationSpeed =
    typeof animationSpeedRaw === "number"
      ? Math.min(2, Math.max(0.1, animationSpeedRaw))
      : 1;

  return {
    assetPath,
    yaw: Number(fields.yaw ?? fields.iconModelYaw) || 0,
    pitch: Number(fields.pitch ?? fields.iconModelPitch) || 0,
    animationPlay: (fields.animationPlay ?? fields.iconModelAnimationPlay) !== false,
    animationSpeed,
  };
}

/** Flatten {@link RemoteAssetStorageRef} for the delete API route. */
export function remoteAssetStorageRefDeletePayload(ref: {
  iconFileId: string | null;
  modelAssetPath: string | null;
}): {
  iconFileId: string;
  iconAssetKind: IconAssetKind;
  iconAssetPath: string;
} {
  const modelAssetPath = ref.modelAssetPath?.trim() ?? "";
  return {
    iconFileId: ref.iconFileId ?? "",
    iconAssetKind: modelAssetPath ? BADGE_MODEL_ASSET_KIND : "image",
    iconAssetPath: modelAssetPath,
  };
}

export type BadgeModelFormFields = Pick<
  FormState,
  | "iconAssetKind"
  | "iconAssetPath"
  | "iconModelYaw"
  | "iconModelPitch"
  | "iconModelAnimationPlay"
  | "iconModelAnimationSpeed"
>;

/** In-progress GLB upload before poster finalize (session / staged commit). */
export function badgeModelFromStagedUpload(staged: {
  modelPath: string;
  iconModelYaw: number;
  iconModelPitch: number;
}): BadgeModelAsset {
  return {
    assetPath: staged.modelPath,
    yaw: staged.iconModelYaw,
    pitch: staged.iconModelPitch,
    animationPlay: true,
    animationSpeed: 1,
  };
}

export function badgeModelFromForm(
  form: BadgeModelFormFields,
): BadgeModelAsset | null {
  return parseBadgeModelAsset({
    iconAssetKind: form.iconAssetKind,
    iconAssetPath: form.iconAssetPath,
    iconModelYaw: form.iconModelYaw,
    iconModelPitch: form.iconModelPitch,
    iconModelAnimationPlay: form.iconModelAnimationPlay,
    iconModelAnimationSpeed: form.iconModelAnimationSpeed,
  });
}

export function applyBadgeModelToForm(
  form: FormState,
  model: BadgeModelAsset | null,
): FormState {
  if (!model) {
    return {
      ...form,
      iconAssetKind: "image",
      iconAssetPath: "",
      iconModelYaw: 0,
      iconModelPitch: 0,
      iconModelAnimationPlay: true,
      iconModelAnimationSpeed: 1,
    };
  }
  return {
    ...form,
    iconAssetKind: BADGE_MODEL_ASSET_KIND,
    iconAssetPath: model.assetPath,
    iconModelYaw: model.yaw,
    iconModelPitch: model.pitch,
    iconModelAnimationPlay: model.animationPlay,
    iconModelAnimationSpeed: model.animationSpeed,
  };
}

export function patchBadgeModelAsset(
  model: BadgeModelAsset,
  patch: Partial<BadgeModelAsset>,
): BadgeModelAsset {
  const animationSpeedRaw = patch.animationSpeed ?? model.animationSpeed;
  return {
    ...model,
    ...patch,
    animationSpeed: Math.min(2, Math.max(0.1, animationSpeedRaw)),
  };
}

export function badgeModelAssetFieldsFromModel(
  model: BadgeModelAsset,
): BadgeModelAssetFields {
  return {
    assetKind: BADGE_MODEL_ASSET_KIND,
    assetPath: model.assetPath,
    yaw: model.yaw,
    pitch: model.pitch,
    animationPlay: model.animationPlay,
    animationSpeed: model.animationSpeed,
  };
}
