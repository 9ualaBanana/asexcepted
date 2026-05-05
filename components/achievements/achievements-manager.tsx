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
  const { data, editorPipeline, ui, badgeMetrics, embedLink } = model;

  return (
    <div className="space-y-6">
      {model.error ? <p className="text-sm text-red-500">{model.error}</p> : null}

      <AchievementGrid
        isLoading={data.isLoading}
        readOnly={model.readOnly}
        items={model.gridItems}
        onAddAchievement={editorPipeline.actions.startCreateFlow}
        onSelectAchievement={(achievementId) => {
          badgeMetrics.markDetailOpenStart(achievementId);
          ui.actions.openDetailView(achievementId);
        }}
      />

      {model.achievementOverlayOpen ? (
        <AchievementDialogStack {...model.dialogStackProps} />
      ) : null}

      {ui.deleteConfirmId ? (
        <AchievementDeleteConfirmDialog
          isSaving={model.isSaving}
          onDismiss={ui.actions.clearDelete}
          onConfirm={() => void data.actions.deleteAchievementById(ui.deleteConfirmId!)}
        />
      ) : null}

      {embedLink.manualEmbedUrl ? (
        <AchievementManualEmbedDialog
          manualEmbedUrl={embedLink.manualEmbedUrl}
          onDismiss={() => embedLink.setManualEmbedUrl(null)}
          onCopied={embedLink.onManualEmbedCopied}
        />
      ) : null}

      {badgeMetrics.badgeDebugOverlay ? (
        <AchievementBadgeDebugOverlay
          detailOpenToImageDecodedMs={badgeMetrics.detailOpenToImageDecodedMs}
          detailOpenToVisualReadyMs={badgeMetrics.detailOpenToVisualReadyMs}
        />
      ) : null}
    </div>
  );
}
