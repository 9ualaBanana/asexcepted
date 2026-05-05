"use client";

export const ACHIEVEMENT_UI_HINT_MS = {
  embedCopied: 2500,
  embedCopyBlocked: 3000,
} as const;

export const ACHIEVEMENT_UI_COPY = {
  validationMeaningfulContent: "Add at least a title, category, or description.",
  embedCopied: "Embed link copied.",
  embedCopyBlockedManual: "Copy was blocked. Use the manual copy sheet below.",
  embedClipboardPermissionBlocked:
    "Clipboard permission was blocked. Use the manual copy sheet below.",
  embedCopyUnknownError: "Could not copy link.",
} as const;
