"use client";

import { AchievementBadgeDebugOverlay } from "@/components/achievements/achievement-badge-debug-overlay";
import { AchievementDeleteConfirmDialog } from "@/components/achievements/achievement-delete-confirm-dialog";
import { AchievementDialogStack } from "@/components/achievements/achievement-dialog-stack";
import { AchievementGrid } from "@/components/achievements/achievement-grid";
import { AchievementManualEmbedDialog } from "@/components/achievements/achievement-manual-embed-dialog";
import { useAchievementsManagerModel } from "@/components/achievements/use-achievements-manager-model";
import { cn } from "@/lib/utils";

export type AchievementsManagerProps = {
  userId: string;
  readOnly: boolean;
  isAdmin?: boolean;
  initialDetailAchievementId?: string | null;
};

export function AchievementsManager({
  userId,
  readOnly,
  isAdmin = false,
  initialDetailAchievementId,
}: AchievementsManagerProps) {
  const model = useAchievementsManagerModel({
    userId,
    readOnly,
    isAdmin,
    initialDetailAchievementId,
  });
  const { data, editorPipeline, ui, badgeMetrics, embedLink } = model;

  return (
    <div className="space-y-1">
      {model.error ? <p className="text-sm text-red-500">{model.error}</p> : null}

      {!readOnly ? (
        <div className="relative flex min-h-[1.25rem] items-center justify-center">
          <p className="text-center font-mono text-[11px] font-normal tabular-nums tracking-[0.18em] text-muted-foreground/40">
            <span>{model.unlockedCount}</span>
            <span className="mx-1.5 text-muted-foreground/25">/</span>
            <span>{model.totalCount}</span>
          </p>
          <button
            type="button"
            onClick={() => model.setHideLocked(!model.hideLocked)}
            className={cn(
              "absolute right-0 top-1/2 -translate-y-1/2 text-[10px] lowercase font-normal tracking-tight",
              model.hideLocked
                ? "text-muted-foreground/45"
                : "text-muted-foreground/28 hover:text-muted-foreground/40",
            )}
            aria-pressed={model.hideLocked}
          >
            hide locked
          </button>
        </div>
      ) : null}

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
