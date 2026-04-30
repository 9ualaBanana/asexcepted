"use client";

import { Button } from "@/components/ui/button";

type AchievementDeleteConfirmDialogProps = {
  isSaving: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
};

export function AchievementDeleteConfirmDialog({
  isSaving,
  onDismiss,
  onConfirm,
}: AchievementDeleteConfirmDialogProps) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-achievement-title"
      className="fixed inset-0 z-[220] flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-transparent bg-background p-6 shadow-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="delete-achievement-title"
          className="text-lg font-semibold tracking-tight"
        >
          Delete achievement?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This cannot be undone. The achievement will be removed and any custom badge image
          stored on ImageKit will be deleted when possible.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onDismiss} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={isSaving}
          >
            {isSaving ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}
