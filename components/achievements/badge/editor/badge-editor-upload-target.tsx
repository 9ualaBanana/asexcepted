"use client";

import type { DragEvent, ReactNode } from "react";

import { cn } from "@/lib/utils";

type BadgeEditorUploadTargetProps = {
  children: ReactNode;
  disabled: boolean;
  busy: boolean;
  hasRemote: boolean;
  ringHaloClassName: string;
  onOpenMenu: () => void;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
};

/** Editor upload hit target around the badge stack (replaces `wrapStack` on `Badge`). */
export function BadgeEditorUploadTarget({
  children,
  disabled,
  busy,
  hasRemote,
  ringHaloClassName,
  onOpenMenu,
  onDragOver,
  onDragLeave,
  onDrop,
}: BadgeEditorUploadTargetProps) {
  return (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={() => !disabled && !busy && onOpenMenu()}
      onDragEnter={onDragOver}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "relative flex h-full w-full min-h-0 min-w-0 cursor-pointer items-center justify-center rounded-none bg-transparent outline-none transition-shadow",
        hasRemote ? "overflow-hidden" : "overflow-visible",
        "focus-visible:outline-none",
        ringHaloClassName,
      )}
      aria-label="Badge"
    >
      {busy ? (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute isolate flex items-center justify-center",
            "inset-[11%]",
          )}
        >
          <div className="badge-upload-bloom absolute inset-0 rounded-full" />
          <div className="badge-upload-blob badge-upload-blob-a absolute h-[68%] w-[68%] rounded-full" />
          <div className="badge-upload-blob badge-upload-blob-b absolute h-[56%] w-[56%] rounded-full" />
          <div className="badge-upload-blob badge-upload-blob-c absolute h-[48%] w-[48%] rounded-full" />
        </div>
      ) : null}
      {children}
    </button>
  );
}
