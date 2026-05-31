"use client";

import { useEffect } from "react";

import { BadgeDebugOverlay } from "@/components/admin/badge-debug-overlay";
import { AchievementDeleteConfirmDialog } from "@/components/achievements/dialogs/achievement-delete-confirm-dialog";
import { AchievementDiscardEditConfirmDialog } from "@/components/achievements/dialogs/achievement-discard-edit-confirm-dialog";
import { AchievementDialogStack } from "@/components/achievements/detail/achievement-dialog-stack";
import { AchievementGrid } from "@/components/achievements/grid/achievement-grid";
import { AchievementManualEmbedDialog } from "@/components/achievements/share/achievement-manual-embed-dialog";
import { DedicationResponseDialog } from "@/components/achievements/dedication/dedication-response-dialog";
import { DedicateInviteConfirmDialog } from "@/components/achievements/dedication/dedicate-invite-confirm-dialog";
import { DedicationSenderConfirmDialog } from "@/components/achievements/dedication/dedication-sender-confirm-dialog";
import { useAchievementsManagerModel } from "@/components/achievements/use-achievements-manager-model";
import { resetBodyScrollLock } from "@/lib/dom/body-scroll-lock";
import { useErrorToast } from "@/lib/toast";
export type AchievementsManagerProps = {
  userId: string;
  readOnly: boolean;
  isAdmin: boolean;
  canDedicate: boolean;
  initialDetailAchievementId?: string | null;
};

export function AchievementsManager({
  userId,
  readOnly,
  isAdmin,
  canDedicate,
  initialDetailAchievementId,
}: AchievementsManagerProps) {
  const model = useAchievementsManagerModel({
    userId,
    readOnly,
    isAdmin,
    canDedicate,
    initialDetailAchievementId,
  });
  const { data, editorPipeline, ui, badgeMetrics, shareInvite } = model;

  useErrorToast(model.error, { id: "achievements-manager" });

  const dedicationAchievement = model.dedicationQueue.dedicationAchievement;
  const dedicationDialogOpen = Boolean(
    model.dedicationQueue.dedicationDialogOpen && dedicationAchievement,
  );

  useEffect(() => {
    if (!model.achievementOverlayOpen && !dedicationDialogOpen) {
      resetBodyScrollLock();
    }
  }, [dedicationDialogOpen, model.achievementOverlayOpen]);

  return (
    <div className="space-y-1">
      <div className="relative flex min-h-[1.25rem] items-center justify-center">
        <p className="text-center font-mono text-[11px] font-normal tabular-nums tracking-[0.18em] text-muted-foreground/40">
          <span>{model.unlockedCount}</span>
          <span className="mx-1.5 text-muted-foreground/25">/</span>
          <span>{model.totalCount}</span>
        </p>
        {!model.readOnly ? (
          <button
            type="button"
            onClick={() => model.cycleVisibilityFilter()}
            className="absolute left-0 top-1/2 -translate-y-1/2 m-0 cursor-pointer border-0 bg-transparent p-0 text-[10px] font-normal lowercase tracking-tight text-muted-foreground/40 shadow-none outline-none hover:text-muted-foreground/40 focus:text-muted-foreground/40 focus-visible:ring-0 active:text-muted-foreground/40"
            aria-label={`Filter by visibility: ${model.visibilityFilter}`}
          >
            {model.visibilityFilter}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => model.setHideLocked(!model.hideLocked)}
          className="absolute right-0 top-1/2 -translate-y-1/2 m-0 cursor-pointer border-0 bg-transparent p-0 text-[10px] font-normal lowercase tracking-tight text-muted-foreground/40 shadow-none outline-none hover:text-muted-foreground/40 focus:text-muted-foreground/40 focus-visible:ring-0 active:text-muted-foreground/40 aria-pressed:text-muted-foreground/40"
          aria-pressed={model.hideLocked}
          aria-label={model.hideLocked ? "Show locked achievements" : "Hide locked achievements"}
        >
          {model.hideLocked ? "show locked" : "hide locked"}
        </button>
      </div>

      <AchievementGrid
        isLoading={data.isLoading}
        readOnly={model.readOnly}
        canDedicate={model.canDedicate}
        items={model.gridItems}
        onAddAchievement={editorPipeline.actions.startCreateFlow}
        onAddDedicatedAchievement={editorPipeline.actions.startDedicateFlow}
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

      {ui.discardEditIntent ? (
        <AchievementDiscardEditConfirmDialog
          onDismiss={ui.actions.clearDiscardEdit}
          onConfirm={model.handleConfirmDiscardPanelEdit}
        />
      ) : null}

      {model.shareInvite.manualShareUrl ? (
        <AchievementManualEmbedDialog
          manualUrl={model.shareInvite.manualShareUrl}
          title="Copy invite link"
          copyAriaLabel="Copy invite link"
          onDismiss={() => model.shareInvite.setManualShareUrl(null)}
          onCopied={model.shareInvite.onManualShareCopied}
        />
      ) : null}

      {model.embedLink.manualEmbedUrl ? (
        <AchievementManualEmbedDialog
          manualUrl={model.embedLink.manualEmbedUrl}
          title="Copy embed link"
          copyAriaLabel="Copy embed link"
          onDismiss={() => model.embedLink.setManualEmbedUrl(null)}
          onCopied={model.embedLink.onManualEmbedCopied}
        />
      ) : null}

      {badgeMetrics.badgeDebugOverlay ? (
        <BadgeDebugOverlay
          detailIsModelBadge={badgeMetrics.detailIsModelBadge}
          detailOpenToImageDecodedMs={badgeMetrics.detailOpenToImageDecodedMs}
          detailOpenToVisualReadyMs={badgeMetrics.detailOpenToVisualReadyMs}
          detailOpenToModelUrlReadyMs={badgeMetrics.detailOpenToModelUrlReadyMs}
          detailOpenToModelVisualReadyMs={badgeMetrics.detailOpenToModelVisualReadyMs}
        />
      ) : null}

      {model.dedicateInviteConfirmOpen ? (
        <DedicateInviteConfirmDialog
          achievementTitle={model.detailAchievement?.title}
          isBusy={model.shareInvite.shareInviteBusy}
          onDismiss={() => model.setDedicateInviteConfirmOpen(false)}
          onConfirm={model.handleConfirmDedicateInviteShare}
        />
      ) : null}

      {model.dedicationSenderConfirmOpen ? (
        <DedicationSenderConfirmDialog
          isSaving={model.isSaving}
          onDismiss={() => model.setDedicationSenderConfirmOpen(false)}
          onConfirm={() => void model.handleConfirmDedicate()}
        />
      ) : null}

      {dedicationDialogOpen && dedicationAchievement ? (
        <DedicationResponseDialog
          achievement={dedicationAchievement}
          senderDisplayName={model.dedicationQueue.dedicationSenderName}
          isBusy={model.dedicationQueue.dedicationBusy}
          onDismiss={model.dedicationQueue.dismissDedicationDialog}
          onAccept={() => void model.dedicationQueue.acceptDedication()}
          onReject={() => void model.dedicationQueue.rejectDedication()}
        />
      ) : null}
    </div>
  );
}
