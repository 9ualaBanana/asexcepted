"use client";

import {
  useId,
  useEffect,
  useState,
  type Dispatch,
  type FormEvent,
  type RefObject,
  type SetStateAction,
} from "react";
import { ArrowLeft, Check, Loader2, Trash2, X } from "lucide-react";

import {
  AchievementRoundBadgeEditor,
  applyBadgeModelPoseSessionToForm,
  type BadgeModelUploadStaged,
  clearSessionStagedUpload,
  rollbackBadgeUploadSession,
  setSessionStagedUpload,
} from "@/components/achievements/badge";
import type { AchievementBadgeSessionController } from "@/components/achievements/use-achievement-badge-session-controller";
import { AchievementVisibilityToggle } from "@/components/achievements/achievement-visibility-toggle";
import {
  achievementBadgeChromeWidth,
  achievementDialogChromeInset,
  achievementDialogIconBtn,
  achievementDialogIconSideSlot,
  type BadgeAssetSession,
  type FormState,
  hasMeaningfulContent,
} from "@/components/achievements/achievement-editor-shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type EditorCardProps = {
  form: FormState;
  setForm: Dispatch<SetStateAction<FormState>>;
  isSaving: boolean;
  onSubmit: (e: FormEvent) => void;
  onCancel?: () => void;
  badgeAssetSessionRef: RefObject<BadgeAssetSession>;
  onClosePanel?: () => void;
  /** Panel edit (not create): top back, bottom save / visibility / delete. */
  showEditChrome?: boolean;
  onUploadInProgressChange?: (inProgress: boolean) => void;
  onRequestDelete?: () => void;
  /** Admin dedicating to another user: always locked + private. */
  dedicateMode?: boolean;
  badgeSessionController?: AchievementBadgeSessionController;
  isCreatingFlow?: boolean;
};

export function EditableAchievementCard({
  form,
  setForm,
  isSaving,
  onSubmit,
  onCancel,
  badgeAssetSessionRef,
  onClosePanel,
  showEditChrome = false,
  onUploadInProgressChange,
  onRequestDelete,
  dedicateMode = false,
  badgeSessionController,
  isCreatingFlow = false,
}: EditorCardProps) {
  const formId = useId();
  const showDialogChrome = Boolean(onClosePanel);
  const [isBadgeUploadInProgress, setIsBadgeUploadInProgress] = useState(false);
  const isSaveDisabled =
    isSaving || isBadgeUploadInProgress || !hasMeaningfulContent(form);
  const closeDisabled = isSaving || isBadgeUploadInProgress;

  useEffect(() => {
    onUploadInProgressChange?.(isBadgeUploadInProgress);
  }, [isBadgeUploadInProgress, onUploadInProgressChange]);

  function resizeTextarea(target: HTMLTextAreaElement) {
    target.style.height = "0px";
    target.style.height = `${target.scrollHeight}px`;
  }

  const fieldMuted = "text-white/45";
  const fieldBody = "text-white/70";
  const fieldTitle = "text-white";

  return (
    <form
      id={formId}
      onSubmit={(e) => {
        if (isBadgeUploadInProgress) {
          e.preventDefault();
          return;
        }
        onSubmit(e);
      }}
      className={cn(
        "relative flex flex-col items-center text-center",
        "pt-0 text-white",
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl",
          "bg-white/12",
        )}
      />

      <div
        className={cn(
          showDialogChrome ? achievementBadgeChromeWidth : "mt-1 w-full",
        )}
      >
        {showDialogChrome ? (
          <div
            className={cn(
              "flex w-full min-h-10 items-center justify-between pb-1",
              achievementDialogChromeInset,
            )}
          >
            {showEditChrome && onCancel ? (
              <button
                type="button"
                aria-label="Back"
                className={achievementDialogIconBtn}
                disabled={closeDisabled}
                onClick={() => onCancel()}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
              </button>
            ) : (
              <span className={achievementDialogIconSideSlot} aria-hidden />
            )}
            <button
              type="button"
              aria-label="Close"
              className={achievementDialogIconBtn}
              disabled={closeDisabled}
              onClick={() => onClosePanel?.()}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ) : null}
        <div className={cn(showDialogChrome && "flex justify-center")}>
          <AchievementRoundBadgeEditor
            imageUrl={form.iconUrl}
            iconFileId={form.iconFileId}
            iconAssetKind={form.iconAssetKind}
            iconAssetPath={form.iconAssetPath}
            iconCcAttribution={form.iconCcAttribution}
            iconModelYaw={form.iconModelYaw}
            iconModelPitch={form.iconModelPitch}
            baselineAsset={badgeAssetSessionRef.current.baseline}
            tone={form.tone}
            isLocked={dedicateMode ? true : form.isLocked}
            icon={form.icon}
            onToneChange={(tone) => setForm((prev) => ({ ...prev, tone }))}
            onToggleLocked={() => {
              if (dedicateMode) return;
              setForm((prev) => ({ ...prev, isLocked: !prev.isLocked }));
            }}
            onIconChange={(icon) => setForm((prev) => ({ ...prev, icon }))}
            iconModelAnimationPlay={form.iconModelAnimationPlay}
            iconModelAnimationSpeed={form.iconModelAnimationSpeed}
            onIconModelAnimationPlayChange={(value) =>
              setForm((prev) => ({ ...prev, iconModelAnimationPlay: value }))
            }
            onIconModelAnimationSpeedChange={(value) =>
              setForm((prev) => ({ ...prev, iconModelAnimationSpeed: value }))
            }
            onModelPoseChange={(yaw, pitch) =>
              setForm((prev) => ({
                ...prev,
                iconModelYaw: yaw,
                iconModelPitch: pitch,
              }))
            }
            allowModelRotation={isCreatingFlow}
            onRemoteUploadCommit={(asset) => {
              rollbackBadgeUploadSession(badgeAssetSessionRef.current);
              setSessionStagedUpload(badgeAssetSessionRef.current, asset);
              setForm((prev) => ({
                ...prev,
                iconUrl: asset.iconUrl,
                iconFileId: asset.iconFileId,
                iconAssetKind: asset.iconAssetKind,
                iconAssetPath: asset.iconAssetPath,
                iconModelYaw: asset.iconModelYaw ?? prev.iconModelYaw,
                iconModelPitch: asset.iconModelPitch ?? prev.iconModelPitch,
              }));
            }}
            onModelUploadStaged={(staged) => {
              rollbackBadgeUploadSession(badgeAssetSessionRef.current);
              badgeSessionController?.setModelPoseSession(
                staged.poseSession,
                isCreatingFlow ? "create" : "panel",
              );
              const asset = {
                iconUrl: staged.previewUrl,
                iconFileId: "",
                iconAssetKind: "model_glb" as const,
                iconAssetPath: staged.modelPath,
                iconModelYaw: staged.iconModelYaw,
                iconModelPitch: staged.iconModelPitch,
              };
              setSessionStagedUpload(badgeAssetSessionRef.current, asset);
              setForm((prev) => applyBadgeModelPoseSessionToForm(prev, staged));
            }}
            onImageUrlChange={(url) =>
              setForm((prev) => ({ ...prev, iconUrl: url }))
            }
            onIconFileIdChange={(fid) =>
              setForm((prev) => ({ ...prev, iconFileId: fid }))
            }
            onIconAssetKindChange={(kind) =>
              setForm((prev) => ({ ...prev, iconAssetKind: kind }))
            }
            onIconAssetPathChange={(path) =>
              setForm((prev) => ({ ...prev, iconAssetPath: path }))
            }
            onIconCcAttributionChange={(value) =>
              setForm((prev) => ({ ...prev, iconCcAttribution: value }))
            }
            onStagedUploadCleared={() => {
              clearSessionStagedUpload(badgeAssetSessionRef.current);
            }}
            onUploadInProgressChange={setIsBadgeUploadInProgress}
            disabled={isSaving}
          />
        </div>
      </div>

      <div className="mt-3 w-full max-w-md px-1">
        <Input
          value={form.category}
          onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
          placeholder="Category"
          className={cn(
            "h-auto border-0 bg-transparent p-0 text-center text-base uppercase tracking-[0.2em] shadow-none focus-visible:ring-0 md:text-base",
            fieldMuted,
            "placeholder:text-white/35",
          )}
        />
      </div>

      <div className="mt-1.5 w-full max-w-md px-1">
        <Input
          value={form.title}
          onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="Title"
          className={cn(
            "h-auto border-0 bg-transparent p-0 text-center text-xl font-semibold leading-tight shadow-none focus-visible:ring-0 md:text-xl",
            fieldTitle,
            "placeholder:text-white/35",
          )}
        />
      </div>

      <div className="mt-2 w-full max-w-md px-1">
        <textarea
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          onInput={(e) => resizeTextarea(e.currentTarget)}
          placeholder="Description"
          rows={1}
          className={cn(
            "min-h-[2.75rem] w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-center text-base leading-relaxed shadow-none focus-visible:ring-0 md:text-base",
            fieldBody,
            "placeholder:text-white/35",
          )}
        />
      </div>

      <div className="relative mx-auto mt-2 flex w-full max-w-[15rem] justify-center">
        <Input
          type="date"
          value={form.achievedAt}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, achievedAt: e.target.value }))
          }
          className={cn(
            "h-10 w-full border-0 bg-transparent pr-[4.5rem] text-center text-base shadow-none focus-visible:ring-0 md:text-base",
            "text-white/80",
          )}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Clear date"
          className={cn(
            "absolute right-7 top-1/2 h-8 w-8 -translate-y-1/2 p-0",
            "text-white/45 hover:bg-white/10 hover:text-white",
          )}
          onClick={() => setForm((prev) => ({ ...prev, achievedAt: "" }))}
        >
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      {showDialogChrome && showEditChrome ? (
        <div
          className={cn(
            achievementBadgeChromeWidth,
            achievementDialogChromeInset,
            "mt-3 flex min-h-10 items-center",
          )}
        >
          <div className={cn(achievementDialogIconSideSlot, "justify-start")}>
            <button
              type="submit"
              aria-label={isSaving ? "Saving" : "Save changes"}
              disabled={isSaveDisabled}
              className={cn(
                achievementDialogIconBtn,
                "bg-white/10 text-white hover:bg-white/15",
              )}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Check className="h-4 w-4" aria-hidden />
              )}
            </button>
          </div>
          <div className="flex min-w-0 flex-1 justify-center">
            <AchievementVisibilityToggle
              visibility={form.visibility}
              disabled={closeDisabled}
              onToggle={(visibility) =>
                setForm((prev) => ({ ...prev, visibility }))
              }
            />
          </div>
          <div className={cn(achievementDialogIconSideSlot, "justify-end")}>
            {onRequestDelete ? (
              <button
                type="button"
                aria-label="Delete"
                className={achievementDialogIconBtn}
                disabled={isSaving || isBadgeUploadInProgress}
                onClick={() => onRequestDelete()}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
      ) : showDialogChrome ? (
        <div
          className={cn(
            achievementBadgeChromeWidth,
            achievementDialogChromeInset,
            "mt-3 flex min-h-10 items-center",
          )}
        >
          <div className={cn(achievementDialogIconSideSlot, "justify-start")}>
            <button
              type="submit"
              aria-label={
                isSaving ? "Saving" : dedicateMode ? "Dedicate achievement" : "Save"
              }
              disabled={isSaveDisabled}
              className={cn(
                achievementDialogIconBtn,
                "bg-white/10 text-white hover:bg-white/15",
              )}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Check className="h-4 w-4" aria-hidden />
              )}
            </button>
          </div>
          <div className="flex min-w-0 flex-1 justify-center">
            {dedicateMode ? null : (
              <AchievementVisibilityToggle
                visibility={form.visibility}
                disabled={closeDisabled}
                onToggle={(visibility) =>
                  setForm((prev) => ({ ...prev, visibility }))
                }
              />
            )}
          </div>
          <div className={cn(achievementDialogIconSideSlot, "justify-end")} aria-hidden />
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Button
            type="submit"
            disabled={isSaveDisabled}
            className="bg-white text-background hover:bg-white/90"
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
          {onCancel ? (
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={isSaving}
              className="bg-white/10 text-white hover:bg-white/15"
            >
              Cancel
            </Button>
          ) : null}
        </div>
      )}
    </form>
  );
}
