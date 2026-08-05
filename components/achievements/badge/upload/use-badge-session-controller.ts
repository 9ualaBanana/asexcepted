"use client";

import { useRef, useState } from "react";

import {
  beginRemoteAssetStorageSession,
  commitRemoteAssetStorageBaseline,
  createEmptyRemoteAssetStorageSession,
  deleteRemoteAssetStorageRefQuietly,
  getReplacedRemoteAssetStorageRef,
  rollbackBadgeUploadSession,
} from "@/components/achievements/badge/upload/badge-asset-session";
import {
  revokeBadgeModelPoseSession,
  type BadgeModelPoseSession,
} from "@/components/achievements/badge/upload/model/badge-model-pose-session";
import { clearBadgeModelPoseSessionRef } from "@/components/achievements/badge/upload/model/use-badge-model-uploader";
import {
  type IconAssetKind,
  type RemoteAssetStorageSession,
} from "@/components/achievements/achievement-editor-shared";
import type { FormState } from "@/lib/achievements/presentation/form-state";
import type { AchievementDetailViewModel } from "@/lib/achievements/presentation/collection-view-models";
import { isModelBadgeAssetKind } from "@/lib/achievements/badge/shared/badge-model-asset";
import { finalizeBadgeModelUpload } from "@/lib/achievements/client/badge-asset";
import {
  createRemoteAssetStorageRef,
  type RemoteAssetStorageRef,
} from "@/lib/upload/remote-asset-storage";

type UseBadgeSessionControllerArgs = {
  isCreating: boolean;
  detailMode: "view" | "edit";
};

/**
 * Owns badge upload session refs + upload flags for create/edit flows.
 */
export function useBadgeSessionController({
  isCreating,
  detailMode,
}: UseBadgeSessionControllerArgs) {
  const [createUploadInProgress, setCreateUploadInProgress] = useState(false);
  const [panelUploadInProgress, setPanelUploadInProgress] = useState(false);
  const createBadgeAssetSessionRef = useRef<RemoteAssetStorageSession>(
    createEmptyRemoteAssetStorageSession(),
  );
  const panelBadgeAssetSessionRef = useRef<RemoteAssetStorageSession>(
    createEmptyRemoteAssetStorageSession(),
  );
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
    createBadgeAssetSessionRef.current = createEmptyRemoteAssetStorageSession();
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
    createBadgeAssetSessionRef.current = beginRemoteAssetStorageSession(
      createRemoteAssetStorageRef({
        iconFileId: asset.iconFileId,
        modelAssetPath:
          isModelBadgeAssetKind(asset.iconAssetKind)
            ? asset.iconAssetPath
            : null,
      }),
    );
    clearModelPoseSession("create");
  };

  const beginPanelBadgeSession = (detail: AchievementDetailViewModel) => {
    panelBadgeAssetSessionRef.current = beginRemoteAssetStorageSession(
      createRemoteAssetStorageRef(detail),
    );
    clearModelPoseSession("panel");
  };

  const rollbackPanelBadgeSession = () => {
    rollbackBadgeUploadSession(panelBadgeAssetSessionRef.current);
    clearModelPoseSession("panel");
  };

  const commitPanelBadgeSession = (updated: AchievementDetailViewModel) => {
    const nextBaseline = createRemoteAssetStorageRef(updated);
    const replacedBaselineRef = commitRemoteAssetStorageBaseline(
      panelBadgeAssetSessionRef.current,
      nextBaseline,
    );
    clearModelPoseSession("panel");
    return replacedBaselineRef;
  };

  const deleteRemoteFilesForAchievement = async (
    target: AchievementDetailViewModel | undefined,
    deletedAchievementId: string,
    detailAchievementId: string | null,
  ) => {
    const persistedRef = createRemoteAssetStorageRef(target ?? {});

    const stagedPanelAsset =
      detailAchievementId === deletedAchievementId
        ? panelBadgeAssetSessionRef.current.staged
        : null;

    await deleteRemoteAssetStorageRefQuietly(persistedRef, (e) =>
      console.warn("Badge asset delete on achievement remove", e),
    );
    if (stagedPanelAsset) {
      const stagedToDelete = getReplacedRemoteAssetStorageRef(
        stagedPanelAsset,
        persistedRef,
      );
      if (stagedToDelete) {
        await deleteRemoteAssetStorageRefQuietly(stagedToDelete, (e) =>
          console.warn("Badge staged asset delete on achievement remove", e),
        );
      }
    }

    if (detailAchievementId === deletedAchievementId) {
      panelBadgeAssetSessionRef.current = createEmptyRemoteAssetStorageSession();
      setPanelUploadInProgress(false);
      clearModelPoseSession("panel");
    }
  };

  const deleteStorageRefQuietly = async (
    ref: RemoteAssetStorageRef,
    warningContext: string,
  ) => {
    await deleteRemoteAssetStorageRefQuietly(ref, (e) => console.warn(warningContext, e));
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
    deleteStorageRefQuietly,
    deleteRemoteFilesForAchievement,
    clearModelPoseSession,
  };
}

export type BadgeSessionController = ReturnType<
  typeof useBadgeSessionController
>;
