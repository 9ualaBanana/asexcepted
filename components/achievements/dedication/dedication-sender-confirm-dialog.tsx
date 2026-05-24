"use client";

import { Button } from "@/components/ui/button";

type DedicationSenderConfirmDialogProps = {
  isSaving: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
};

export function DedicationSenderConfirmDialog({
  isSaving,
  onDismiss,
  onConfirm,
}: DedicationSenderConfirmDialogProps) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="dedication-sender-confirm-title"
      className="fixed inset-0 z-[230] flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-transparent bg-background p-6 shadow-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="dedication-sender-confirm-title"
          className="text-lg font-semibold tracking-tight"
        >
          Dedicate this achievement?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You will not be able to edit it after dedicating. The recipient will receive
          it locked and private, and can accept or reject it from their achievements
          page.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onDismiss} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isSaving}>
            {isSaving ? "Dedicating…" : "Dedicate"}
          </Button>
        </div>
      </div>
    </div>
  );
}
