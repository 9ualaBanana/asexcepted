"use client";

import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { copyTextToClipboard } from "@/lib/copy-text-to-clipboard";

type AchievementManualEmbedDialogProps = {
  manualEmbedUrl: string;
  onDismiss: () => void;
  onCopied: () => void;
};

export function AchievementManualEmbedDialog({
  manualEmbedUrl,
  onDismiss,
  onCopied,
}: AchievementManualEmbedDialogProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-copy-title"
      className="fixed inset-0 z-[230] flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#12101a] p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="manual-copy-title" className="text-base font-semibold text-white">
          Copy embed link
        </h2>
        <div className="relative mt-3">
          <input
            readOnly
            value={manualEmbedUrl}
            className="h-10 w-full overflow-hidden rounded-md border border-white/15 bg-black/25 pl-3 pr-11 text-xs text-white/85"
            onFocus={(e) => e.currentTarget.select()}
          />
          <button
            type="button"
            aria-label="Copy embed link"
            className="absolute right-1 top-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-white/75 transition hover:bg-white/10 hover:text-white"
            onClick={() => {
              void copyTextToClipboard(manualEmbedUrl);
              onCopied();
            }}
          >
            <Copy className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <Button type="button" onClick={onDismiss}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
