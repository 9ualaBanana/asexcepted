"use client";

import { useRef, useState } from "react";

import {
  createAchievementBadgeRemoteAsset,
  clearSessionStagedUpload,
  deleteBadgeRemoteAssetQuietly,
  getReplacedBadgeRemoteAsset,
  rollbackBadgeUploadSession,
} from "@/components/achievements/badge/badge-asset-session";
import {
  createEmptyBadgeAssetSession,
  getSafeIconAssetKind,
  type BadgeAssetSession,
} from "@/components/achievements/achievement-editor-shared";
import type { AchievementRecord } from "@/components/achievements/achievement-transformers";

type UseAchievementBadgeSessionControllerArgs = {
  isCreating: boolean;
  detailMode: "view" | "edit";
};

/**
 * Owns badge ImageKit session refs + upload flags for create/edit flows.
 */
export function useAchievementBadgeSessionController({
  isCreating,
  detailMode,
}: UseAchievementBadgeSessionControllerArgs) {
  const [createUploadInProgress, setCreateUploadInProgress] = useState(false);
  const [panelUploadInProgress, setPanelUploadInProgress] = useState(false);
  const createBadgeAssetSessionRef = useRef<BadgeAssetSession>(createEmptyBadgeAssetSession());
  const panelBadgeAssetSessionRef = useRef<BadgeAssetSession>(createEmptyBadgeAssetSession());

  const editorUploadInProgress =
    (isCreating && createUploadInProgress) ||
    (detailMode === "edit" && panelUploadInProgress);

  const beginCreateBadgeSession = () => {
    createBadgeAssetSessionRef.current = createEmptyBadgeAssetSession();
  };

  const rollbackCreateBadgeSession = () => {
    rollbackBadgeUploadSession(createBadgeAssetSessionRef.current);
  };

  const retainCreateBadgeSession = (asset: {
    iconUrl?: string | null;
    iconFileId?: string | null;
    iconAssetKind?: string | null;
    iconAssetPath?: string | null;
  }) => {
    createBadgeAssetSessionRef.current = {
      baseline: createAchievementBadgeRemoteAsset({
        iconUrl: asset.iconUrl ?? "",
        iconFileId: asset.iconFileId ?? "",
        iconAssetKind: getSafeIconAssetKind(asset.iconAssetKind),
        iconAssetPath: asset.iconAssetPath ?? "",
      }),
      staged: null,
    };
  };

  const beginPanelBadgeSession = (detailAchievement: AchievementRecord) => {
    panelBadgeAssetSessionRef.current = {
      baseline: createAchievementBadgeRemoteAsset({
        iconUrl: detailAchievement.icon_url ?? "",
        iconFileId: detailAchievement.icon_file_id ?? "",
        iconAssetKind: detailAchievement.icon_asset_kind,
        iconAssetPath: detailAchievement.icon_asset_path ?? "",
      }),
      staged: null,
    };
  };

  const rollbackPanelBadgeSession = () => {
    rollbackBadgeUploadSession(panelBadgeAssetSessionRef.current);
  };

  const commitPanelBadgeSession = (updatedAchievement: AchievementRecord) => {
    const nextBaseline = createAchievementBadgeRemoteAsset({
      iconUrl: updatedAchievement.icon_url ?? "",
      iconFileId: updatedAchievement.icon_file_id ?? "",
      iconAssetKind: updatedAchievement.icon_asset_kind,
      iconAssetPath: updatedAchievement.icon_asset_path ?? "",
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
    return replacedBaselineAsset;
  };

  const deleteRemoteFilesForAchievement = async (
    target: AchievementRecord | undefined,
    deletedAchievementId: string,
    detailAchievementId: string | null,
  ) => {
    const persistedAsset = createAchievementBadgeRemoteAsset(
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
    beginCreateBadgeSession,
    rollbackCreateBadgeSession,
    retainCreateBadgeSession,
    beginPanelBadgeSession,
    rollbackPanelBadgeSession,
    commitPanelBadgeSession,
    deleteRemoteAssetQuietly,
    deleteRemoteFilesForAchievement,
  };
}

export type AchievementBadgeSessionController = ReturnType<
  typeof useAchievementBadgeSessionController
>;
