"use client";

import { useRef, useState } from "react";

import {
  clearBadgeModelPoseSessionRef,
  createBadgeRemoteAsset,
  clearSessionStagedUpload,
  deleteBadgeRemoteAssetQuietly,
  getReplacedBadgeRemoteAsset,
  rollbackBadgeUploadSession,
  revokeBadgeModelPoseSession,
  type BadgeModelPoseSession,
} from "@/components/achievements/badge";
import {
  createEmptyBadgeAssetSession,
  getSafeIconAssetKind,
  type BadgeAssetSession,
  type FormState,
} from "@/components/achievements/achievement-editor-shared";
import type { AchievementRecord } from "@/lib/achievements/data/achievement-transformers";
import { finalizeBadgeModelUpload } from "@/lib/badge-asset-client";

type UseBadgeSessionControllerArgs = {
  isCreating: boolean;
  detailMode: "view" | "edit";
};

/**
 * Owns badge ImageKit session refs + upload flags for create/edit flows.
 */
export function useBadgeSessionController({
  isCreating,
  detailMode,
}: UseBadgeSessionControllerArgs) {
  const [createUploadInProgress, setCreateUploadInProgress] = useState(false);
  const [panelUploadInProgress, setPanelUploadInProgress] = useState(false);
  const createBadgeAssetSessionRef = useRef<BadgeAssetSession>(createEmptyBadgeAssetSession());
  const panelBadgeAssetSessionRef = useRef<BadgeAssetSession>(createEmptyBadgeAssetSession());
  const createModelPoseSessionRef = useRef<BadgeModelPoseSession | null>(null);
  const panelModelPoseSessionRef = useRef<BadgeModelPoseSession | null>(null);

  const activeModelPoseSessionRef = isCreating
    ? createModelPoseSessionRef
    : panelModelPoseSessionRef;

  const editorUploadInProgress =
    (isCreating && createUploadInProgress) ||
    (detailMode === "edit" && panelUploadInProgress);

  const clearModelPoseSession = (scope: "create" | "panel" | "active") => {
    if (scope === "create" || scope === "active") {
      clearBadgeModelPoseSessionRef(createModelPoseSessionRef);
    }
    if (scope === "panel" || scope === "active") {
      clearBadgeModelPoseSessionRef(panelModelPoseSessionRef);
    }
  };

  const setModelPoseSession = (
    session: BadgeModelPoseSession | null,
    scope: "create" | "panel",
  ) => {
    const targetRef = scope === "create" ? createModelPoseSessionRef : panelModelPoseSessionRef;
    revokeBadgeModelPoseSession(targetRef.current);
    targetRef.current = session;
  };

  const hasModelPoseSession = (): boolean => {
    const session = activeModelPoseSessionRef.current;
    return Boolean(session && !session.finalized);
  };

  const finalizeModelPoseForForm = async (form: FormState): Promise<FormState> => {
    const session = activeModelPoseSessionRef.current;
    if (!session || session.finalized) return form;
    const snapshot = await session.createPreviewBlob(form.iconModelYaw, form.iconModelPitch);

    const uploaded = await finalizeBadgeModelUpload({
      modelPath: form.iconAssetPath.trim(),
      poster: snapshot,
    });

    session.finalized = true;
    revokeBadgeModelPoseSession(session);
    activeModelPoseSessionRef.current = null;

    return {
      ...form,
      iconUrl: uploaded.iconUrl,
      iconAssetKind: "model_glb",
      iconAssetPath: uploaded.iconAssetPath,
    };
  };

  const beginCreateBadgeSession = () => {
    createBadgeAssetSessionRef.current = createEmptyBadgeAssetSession();
    clearModelPoseSession("create");
  };

  const rollbackCreateBadgeSession = () => {
    rollbackBadgeUploadSession(createBadgeAssetSessionRef.current);
    clearModelPoseSession("create");
  };

  const retainCreateBadgeSession = (asset: {
    iconUrl?: string | null;
    iconFileId?: string | null;
    iconAssetKind?: string | null;
    iconAssetPath?: string | null;
    iconModelYaw?: number | null;
    iconModelPitch?: number | null;
  }) => {
    createBadgeAssetSessionRef.current = {
      baseline: createBadgeRemoteAsset({
        iconUrl: asset.iconUrl ?? "",
        iconFileId: asset.iconFileId ?? "",
        iconAssetKind: getSafeIconAssetKind(asset.iconAssetKind),
        iconAssetPath: asset.iconAssetPath ?? "",
        iconModelYaw: asset.iconModelYaw ?? 0,
        iconModelPitch: asset.iconModelPitch ?? 0,
      }),
      staged: null,
    };
    clearModelPoseSession("create");
  };

  const beginPanelBadgeSession = (detailAchievement: AchievementRecord) => {
    panelBadgeAssetSessionRef.current = {
      baseline: createBadgeRemoteAsset({
        iconUrl: detailAchievement.icon_url ?? "",
        iconFileId: detailAchievement.icon_file_id ?? "",
        iconAssetKind: detailAchievement.icon_asset_kind,
        iconAssetPath: detailAchievement.icon_asset_path ?? "",
        iconModelYaw: detailAchievement.icon_model_yaw,
        iconModelPitch: detailAchievement.icon_model_pitch,
      }),
      staged: null,
    };
    clearModelPoseSession("panel");
  };

  const rollbackPanelBadgeSession = () => {
    rollbackBadgeUploadSession(panelBadgeAssetSessionRef.current);
    clearModelPoseSession("panel");
  };

  const commitPanelBadgeSession = (updatedAchievement: AchievementRecord) => {
    const nextBaseline = createBadgeRemoteAsset({
      iconUrl: updatedAchievement.icon_url ?? "",
      iconFileId: updatedAchievement.icon_file_id ?? "",
      iconAssetKind: updatedAchievement.icon_asset_kind,
      iconAssetPath: updatedAchievement.icon_asset_path ?? "",
      iconModelYaw: updatedAchievement.icon_model_yaw,
      iconModelPitch: updatedAchievement.icon_model_pitch,
    });
    const replacedBaselineAsset = getReplacedBadgeRemoteAsset(
      panelBadgeAssetSessionRef.current.baseline,
      nextBaseline,
    );
    panelBadgeAssetSessionRef.current = {
      baseline: nextBaseline,
      staged: panelBadgeAssetSessionRef.current.staged,
    };
    clearSessionStagedUpload(panelBadgeAssetSessionRef.current);
    clearModelPoseSession("panel");
    return replacedBaselineAsset;
  };

  const deleteRemoteFilesForAchievement = async (
    target: AchievementRecord | undefined,
    deletedAchievementId: string,
    detailAchievementId: string | null,
  ) => {
    const persistedAsset = createBadgeRemoteAsset(
      target
        ? {
            iconUrl: target.icon_url ?? "",
            iconFileId: target.icon_file_id ?? "",
            iconAssetKind: target.icon_asset_kind,
            iconAssetPath: target.icon_asset_path ?? "",
          }
        : null,
    );
    const stagedPanelAsset =
      detailAchievementId === deletedAchievementId
        ? panelBadgeAssetSessionRef.current.staged
        : null;

    await deleteBadgeRemoteAssetQuietly(persistedAsset, (e) =>
      console.warn("Badge asset delete on achievement remove", e),
    );
    const stagedToDelete = getReplacedBadgeRemoteAsset(stagedPanelAsset, persistedAsset);
    if (stagedToDelete) {
      await deleteBadgeRemoteAssetQuietly(stagedToDelete, (e) =>
        console.warn("Badge staged asset delete on achievement remove", e),
      );
    }

    if (detailAchievementId === deletedAchievementId) {
      panelBadgeAssetSessionRef.current = createEmptyBadgeAssetSession();
      setPanelUploadInProgress(false);
      clearModelPoseSession("panel");
    }
  };

  const deleteRemoteAssetQuietly = async (
    asset: {
      iconUrl?: string;
      iconFileId?: string;
      iconAssetKind?: "image" | "model_glb";
      iconAssetPath?: string;
    } | null | undefined,
    warningContext: string,
  ) => {
    await deleteBadgeRemoteAssetQuietly(asset, (e) => console.warn(warningContext, e));
  };

  return {
    createUploadInProgress,
    setCreateUploadInProgress,
    panelUploadInProgress,
    setPanelUploadInProgress,
    editorUploadInProgress,
    createBadgeAssetSessionRef,
    panelBadgeAssetSessionRef,
    createModelPoseSessionRef,
    panelModelPoseSessionRef,
    setModelPoseSession,
    hasModelPoseSession,
    finalizeModelPoseForForm,
    beginCreateBadgeSession,
    rollbackCreateBadgeSession,
    retainCreateBadgeSession,
    beginPanelBadgeSession,
    rollbackPanelBadgeSession,
    commitPanelBadgeSession,
    deleteRemoteAssetQuietly,
    deleteRemoteFilesForAchievement,
    clearModelPoseSession,
  };
}

export type BadgeSessionController = ReturnType<
  typeof useBadgeSessionController
>;
