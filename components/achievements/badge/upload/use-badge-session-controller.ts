"use client";

import { useRef, useState } from "react";

import {
  createBadgeRemoteAsset,
  clearSessionStagedUpload,
  deleteBadgeRemoteAssetQuietly,
  getReplacedBadgeRemoteAsset,
  rollbackBadgeUploadSession,
} from "@/components/achievements/badge/upload/badge-asset-session";
import {
  revokeBadgeModelPoseSession,
  type BadgeModelPoseSession,
} from "@/components/achievements/badge/upload/model/badge-model-pose-session";
import { clearBadgeModelPoseSessionRef } from "@/components/achievements/badge/upload/model/use-badge-model-uploader";
import {
  createEmptyBadgeAssetSession,
  getSafeIconAssetKind,
  type IconAssetKind,
  type BadgeAssetSession,
  type BadgeRemoteAsset,
  type FormState,
} from "@/components/achievements/achievement-editor-shared";
import { badgeModelFromForm } from "@/lib/achievements/badge/shared/badge-model-asset";
import type { AchievementDetailViewModel } from "@/lib/achievements/data/achievement-view-models";
import { finalizeBadgeModelUpload } from "@/lib/achievements/client/badge-asset";

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

    const uploadedResult = await finalizeBadgeModelUpload({
      modelPath: form.iconAssetPath.trim(),
      poster: snapshot,
    });
    if (uploadedResult.isErr()) {
      throw new Error(uploadedResult.error);
    }
    const uploaded = uploadedResult.value;

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
    iconAssetKind?: IconAssetKind | null;
    iconAssetPath?: string | null;
    iconModelYaw?: number | null;
    iconModelPitch?: number | null;
  }) => {
    createBadgeAssetSessionRef.current = {
      baseline: createBadgeRemoteAsset({
        iconUrl: asset.iconUrl ?? "",
        iconFileId: asset.iconFileId ?? "",
        model: badgeModelFromForm({
          iconAssetKind: getSafeIconAssetKind(asset.iconAssetKind),
          iconAssetPath: asset.iconAssetPath ?? "",
          iconCcAttribution: "",
          iconModelYaw: asset.iconModelYaw ?? 0,
          iconModelPitch: asset.iconModelPitch ?? 0,
          iconModelAnimationPlay: true,
          iconModelAnimationSpeed: 1,
        }),
      }),
      staged: null,
    };
    clearModelPoseSession("create");
  };

  const beginPanelBadgeSession = (detail: AchievementDetailViewModel) => {
    panelBadgeAssetSessionRef.current = {
      baseline: createBadgeRemoteAsset({
        iconUrl: detail.iconUrl ?? "",
        iconFileId: detail.iconFileId ?? "",
        model: detail.model,
      }),
      staged: null,
    };
    clearModelPoseSession("panel");
  };

  const rollbackPanelBadgeSession = () => {
    rollbackBadgeUploadSession(panelBadgeAssetSessionRef.current);
    clearModelPoseSession("panel");
  };

  const commitPanelBadgeSession = (updated: AchievementDetailViewModel) => {
    const nextBaseline = createBadgeRemoteAsset({
      iconUrl: updated.iconUrl ?? "",
      iconFileId: updated.iconFileId ?? "",
      model: updated.model,
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
    target: AchievementDetailViewModel | undefined,
    deletedAchievementId: string,
    detailAchievementId: string | null,
  ) => {
    const persistedAsset = createBadgeRemoteAsset(
      target
        ? {
            iconUrl: target.iconUrl ?? "",
            iconFileId: target.iconFileId ?? "",
            model: target.model,
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
    asset: Partial<BadgeRemoteAsset> | null | undefined,
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
