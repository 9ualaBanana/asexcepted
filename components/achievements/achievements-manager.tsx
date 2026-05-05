"use client";

import { AchievementBadgeDebugOverlay } from "@/components/achievements/achievement-badge-debug-overlay";
import { AchievementDeleteConfirmDialog } from "@/components/achievements/achievement-delete-confirm-dialog";
import { AchievementDialogStack } from "@/components/achievements/achievement-dialog-stack";
import { AchievementGrid } from "@/components/achievements/achievement-grid";
import { AchievementManualEmbedDialog } from "@/components/achievements/achievement-manual-embed-dialog";
import { useAchievementsManagerModel } from "@/components/achievements/use-achievements-manager-model";

export type AchievementsManagerProps = {
  userId: string;
  readOnly: boolean;
};

export function AchievementsManager({
  userId,
  readOnly,
}: AchievementsManagerProps) {
  const model = useAchievementsManagerModel({ userId, readOnly });

  return (
    <div className="space-y-6">
      {model.error ? <p className="text-sm text-red-500">{model.error}</p> : null}

      <AchievementGrid
        isLoading={model.data.isLoading}
        readOnly={model.readOnly}
        items={model.gridItems}
        onAddAchievement={model.editorPipeline.actions.startCreateFlow}
        onSelectAchievement={(achievementId) => {
          model.badgeMetrics.markDetailOpenStart(achievementId);
          model.ui.actions.openDetailView(achievementId);
        }}
      />

      {model.achievementOverlayOpen ? (
        <AchievementDialogStack {...model.dialogStackProps} />
      ) : null}

      {model.ui.deleteConfirmId ? (
        <AchievementDeleteConfirmDialog
          isSaving={model.isSaving}
          onDismiss={model.ui.actions.clearDelete}
          onConfirm={() => void model.data.actions.deleteAchievementById(model.ui.deleteConfirmId!)}
        />
      ) : null}

      {model.embedLink.manualEmbedUrl ? (
        <AchievementManualEmbedDialog
          manualEmbedUrl={model.embedLink.manualEmbedUrl}
          onDismiss={() => model.embedLink.setManualEmbedUrl(null)}
          onCopied={model.embedLink.onManualEmbedCopied}
        />
      ) : null}

      {model.badgeMetrics.badgeDebugOverlay ? (
        <AchievementBadgeDebugOverlay
          detailOpenToImageDecodedMs={model.badgeMetrics.detailOpenToImageDecodedMs}
          detailOpenToVisualReadyMs={model.badgeMetrics.detailOpenToVisualReadyMs}
        />
      ) : null}
    </div>
  );
}
