"use client";

import { Button } from "@/components/ui/button";

type DedicateInviteConfirmDialogProps = {
  achievementTitle?: string | null;
  isBusy: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
};

export function DedicateInviteConfirmDialog({
  achievementTitle,
  isBusy,
  onDismiss,
  onConfirm,
}: DedicateInviteConfirmDialogProps) {
  const label = achievementTitle?.trim() || "this achievement";

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="dedicate-invite-confirm-title"
      className="fixed inset-0 z-[230] flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-transparent bg-background p-6 shadow-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="dedicate-invite-confirm-title"
          className="text-lg font-semibold tracking-tight"
        >
          Dedicate with an invite link?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A one-time link will be created for {label}. A copy of the badge (including 3D
          models) is stored on the invite. It will be removed from your collection so only
          the recipient can claim it into theirs.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onDismiss} disabled={isBusy}>
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isBusy}>
            {isBusy ? "Creating link…" : "Create dedicate link"}
          </Button>
        </div>
      </div>
    </div>
  );
}
