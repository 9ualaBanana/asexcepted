"use client";

import { useRef, useState } from "react";

import type { BadgeIkSession } from "@/components/achievements/achievement-editor-shared";
import { createEmptyBadgeIkSession } from "@/components/achievements/achievement-editor-shared";
import {
  clearSessionStagedUpload,
  deleteImageKitFileQuietly,
  getReplacedImageKitFileId,
  normalizeImageKitFileId,
  rollbackBadgeUploadSession,
} from "@/components/achievements/badge/badge-imagekit-session";
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
  const createBadgeIkSessionRef = useRef<BadgeIkSession>(createEmptyBadgeIkSession());
  const panelBadgeIkSessionRef = useRef<BadgeIkSession>(createEmptyBadgeIkSession());

  const editorUploadInProgress =
    (isCreating && createUploadInProgress) ||
    (detailMode === "edit" && panelUploadInProgress);

  const beginCreateBadgeSession = () => {
    createBadgeIkSessionRef.current = createEmptyBadgeIkSession();
  };

  const rollbackCreateBadgeSession = () => {
    rollbackBadgeUploadSession(createBadgeIkSessionRef.current);
  };

  const beginPanelBadgeSession = (detailAchievement: AchievementRecord) => {
    panelBadgeIkSessionRef.current = {
      baselineUrl: detailAchievement.icon_url ?? "",
      baselineFileId: detailAchievement.icon_file_id ?? "",
      lastSessionFileId: null,
    };
  };

  const rollbackPanelBadgeSession = () => {
    rollbackBadgeUploadSession(panelBadgeIkSessionRef.current);
  };

  const commitPanelBadgeSession = (updatedAchievement: AchievementRecord): string | null => {
    const baselineId = normalizeImageKitFileId(panelBadgeIkSessionRef.current.baselineFileId);
    const savedFileId = normalizeImageKitFileId(updatedAchievement.icon_file_id);
    const replacedBaselineId = getReplacedImageKitFileId(baselineId, savedFileId);
    panelBadgeIkSessionRef.current = {
      baselineUrl: (updatedAchievement.icon_url ?? "").trim(),
      baselineFileId: savedFileId,
      lastSessionFileId: panelBadgeIkSessionRef.current.lastSessionFileId,
    };
    clearSessionStagedUpload(panelBadgeIkSessionRef.current);
    return replacedBaselineId;
  };

  const deleteRemoteFilesForAchievement = async (
    target: AchievementRecord | undefined,
    deletedAchievementId: string,
    detailAchievementId: string | null,
  ) => {
    const persistedFileId = normalizeImageKitFileId(target?.icon_file_id);
    const stagedPanelFileId =
      detailAchievementId === deletedAchievementId
        ? normalizeImageKitFileId(panelBadgeIkSessionRef.current.lastSessionFileId)
        : "";

    await deleteImageKitFileQuietly(persistedFileId, (e) =>
      console.warn("ImageKit delete on achievement remove", e),
    );
    if (stagedPanelFileId && stagedPanelFileId !== persistedFileId) {
      await deleteImageKitFileQuietly(stagedPanelFileId, (e) =>
        console.warn("ImageKit staged delete on achievement remove", e),
      );
    }

    if (detailAchievementId === deletedAchievementId) {
      panelBadgeIkSessionRef.current = createEmptyBadgeIkSession();
      setPanelUploadInProgress(false);
    }
  };

  const deleteRemoteFileIdQuietly = async (
    fileId: string | null | undefined,
    warningContext: string,
  ) => {
    await deleteImageKitFileQuietly(fileId, (e) => console.warn(warningContext, e));
  };

  return {
    createUploadInProgress,
    setCreateUploadInProgress,
    panelUploadInProgress,
    setPanelUploadInProgress,
    editorUploadInProgress,
    createBadgeIkSessionRef,
    panelBadgeIkSessionRef,
    beginCreateBadgeSession,
    rollbackCreateBadgeSession,
    beginPanelBadgeSession,
    rollbackPanelBadgeSession,
    commitPanelBadgeSession,
    deleteRemoteFileIdQuietly,
    deleteRemoteFilesForAchievement,
  };
}

export type AchievementBadgeSessionController = ReturnType<
  typeof useAchievementBadgeSessionController
>;
