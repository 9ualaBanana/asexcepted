"use client";

import { Button } from "@/components/ui/button";

type AchievementDiscardEditConfirmDialogProps = {
  onDismiss: () => void;
  onConfirm: () => void;
};

export function AchievementDiscardEditConfirmDialog({
  onDismiss,
  onConfirm,
}: AchievementDiscardEditConfirmDialogProps) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="discard-edit-achievement-title"
      className="fixed inset-0 z-[220] flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-transparent bg-background p-6 shadow-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="discard-edit-achievement-title"
          className="text-lg font-semibold tracking-tight"
        >
          Discard changes?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You have unsaved edits. Going back will discard them and return to the
          achievement view.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onDismiss}>
            Keep editing
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm}>
            Discard
          </Button>
        </div>
      </div>
    </div>
  );
}
