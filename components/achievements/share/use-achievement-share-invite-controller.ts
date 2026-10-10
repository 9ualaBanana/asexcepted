"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { ACHIEVEMENT_UI_COPY } from "@/components/achievements/share/achievement-ui-copy";
import { copyTextToClipboard } from "@/lib/copy-text-to-clipboard";
import {
  postCreateAchievementShareInvite as postShareAchievement,
  postEndAchievementCollaboration,
  type AchievementShareInviteIntent,
} from "@/lib/achievements/client/share-invite-api";
import {
  type AchievementViewModel,
} from "@/lib/achievements/presentation/collection-view-models";
import {
  canDedicateAchievementViaShareInvite,
  getAchievementShareReadinessError,
} from "@/lib/share-invites/eligibility";
import { showErrorToast, toast } from "@/lib/toast";

type NativeShareAttemptResult = "shared" | "cancelled" | "fallback";

async function tryNativeShare(args: {
  shareUrl: string;
  title?: string | null;
  text?: string | null;
}): Promise<NativeShareAttemptResult> {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return "fallback";
  }

  try {
    await navigator.share({
      url: args.shareUrl,
      title: args.title ?? undefined,
      text: args.text ?? undefined,
    });
    return "shared";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return "cancelled";
    }
    return "fallback";
  }
}

type UseAchievementShareInviteControllerArgs = {
  shelfUserId: string;
  detailAchievement: AchievementViewModel | null;
  /** Called after a dedicate invite is created (sender copy removed server-side). */
  onReloadRequired: () => void;
};

function refuseWhen(reason: string | null, toastId: string) {
  if (!reason) return false;
  showErrorToast(reason, { id: toastId });
  return true;
}

export function useAchievementShareInviteController({
  shelfUserId,
  detailAchievement,
  onReloadRequired,
}: UseAchievementShareInviteControllerArgs) {
  const [shareInviteBusy, setShareInviteBusy] = useState(false);
  const [manualShareUrl, setManualShareUrl] = useState<string | null>(null);
  const [dedicateInviteConfirmOpen, setDedicateInviteConfirmOpen] = useState(false);
  const dedicateRequestInFlightRef = useRef(false);

  const ownsCard = detailAchievement?.userId === shelfUserId;
  const isShelfCollaborator = detailAchievement != null && !ownsCard;
  const showDedicateShareOption =
    ownsCard &&
    detailAchievement != null &&
    canDedicateAchievementViaShareInvite(detailAchievement);
  const showCollaborateShareOption =
    showDedicateShareOption && detailAchievement?.collaboratorUserId == null;
  const collaborationPartnerUserId = detailAchievement?.collaboratorUserId
    ? ownsCard
      ? detailAchievement.collaboratorUserId
      : detailAchievement.userId
    : null;

  const shareReadinessError = useMemo(() => {
    if (!detailAchievement) return null;
    return getAchievementShareReadinessError({
      icon_url: detailAchievement.iconUrl,
      icon_asset_kind: detailAchievement.model ? "model_glb" : "image",
      icon_asset_path: detailAchievement.model?.assetPath ?? null,
    });
  }, [detailAchievement]);

  const showcaseShareDisabledReason = isShelfCollaborator
    ? ACHIEVEMENT_UI_COPY.shareMenuCollaboratorShowcaseBlocked
    : shareReadinessError;

  const shareExistingAchievement = useCallback(
    async (intent: AchievementShareInviteIntent) => {
      if (!detailAchievement) return;
      if (intent === "dedicate") {
        if (dedicateRequestInFlightRef.current) return;
        dedicateRequestInFlightRef.current = true;
      }

      setShareInviteBusy(true);
      try {
        const shareInviteResult = await postShareAchievement({
          achievementId: detailAchievement.id,
          intent,
        });

        if (shareInviteResult.isErr()) {
          showErrorToast(shareInviteResult.error, { id: "achievement-share-invite-create" });
          return;
        }

        const shareUrl = shareInviteResult.value.shareUrl;
        await displayShareLink(shareUrl);

        // achievement disappears from owner collection
        if (intent === "dedicate") {
          onReloadRequired();
        }
      } catch (error) {
        showErrorToast(
          error instanceof Error ? error.message : ACHIEVEMENT_UI_COPY.shareInviteUnknownError,
          { id: "achievement-share-invite-existing" },
        );
      } finally {
        if (intent === "dedicate") {
          dedicateRequestInFlightRef.current = false;
        }
        setShareInviteBusy(false);
      }
    },
    [detailAchievement, onReloadRequired],
  );

  const displayShareLink = useCallback(async (shareUrl: string) => {
    const nativeShareResult = await tryNativeShare({
      shareUrl,
      title: detailAchievement?.title,
      text: detailAchievement?.description,
    });
    if (nativeShareResult === "fallback") {
      await finishWithClipboardFallback(shareUrl);
    }
  }, [detailAchievement]);

  async function finishWithClipboardFallback(shareUrl: string) {
    const copied = await copyTextToClipboard(shareUrl);
    if (copied) {
      toast.success(ACHIEVEMENT_UI_COPY.shareInviteCopied, {
        id: "achievement-share-invite-copied",
      });
      return;
    }

    setManualShareUrl(shareUrl);
    showErrorToast(ACHIEVEMENT_UI_COPY.shareInviteCopyBlockedManual, {
      id: "achievement-share-invite-manual-copy",
    });
  }

  const shareShowcaseAchievement = useCallback(() => {
    if (refuseWhen(showcaseShareDisabledReason, "achievement-showcase-not-ready")) return;
    void shareExistingAchievement("showcase");
  }, [shareExistingAchievement, showcaseShareDisabledReason]);

  const shareDedicationInvite = useCallback(() => {
    void shareExistingAchievement("dedicate");
  }, [shareExistingAchievement]);

  const shareCollaborateInvite = useCallback(() => {
    if (!showCollaborateShareOption) return;
    if (refuseWhen(shareReadinessError, "achievement-collaborate-not-ready")) return;
    void shareExistingAchievement("collaborate");
  }, [shareExistingAchievement, shareReadinessError, showCollaborateShareOption]);

  const endCollaboration = useCallback(async () => {
    if (!detailAchievement?.collaboratorUserId) return;
    setShareInviteBusy(true);
    try {
      const result = await postEndAchievementCollaboration(detailAchievement.id);
      if (result.isErr()) {
        showErrorToast(result.error, { id: "achievement-end-collaboration" });
        return;
      }
      onReloadRequired();
    } catch (error) {
      showErrorToast(
        error instanceof Error ? error.message : "Could not end this collaboration.",
        { id: "achievement-end-collaboration" },
      );
    } finally {
      setShareInviteBusy(false);
    }
  }, [detailAchievement, onReloadRequired]);

  const requestDedicateInviteShare = useCallback(() => {
    if (!showDedicateShareOption) return;
    if (refuseWhen(shareReadinessError, "achievement-dedicate-not-ready")) return;
    setDedicateInviteConfirmOpen(true);
  }, [shareReadinessError, showDedicateShareOption]);

  const confirmDedicateInviteShare = useCallback(() => {
    if (
      !showDedicateShareOption ||
      refuseWhen(shareReadinessError, "achievement-dedicate-not-ready")
    ) {
      setDedicateInviteConfirmOpen(false);
      return;
    }
    setDedicateInviteConfirmOpen(false);
    void shareExistingAchievement("dedicate");
  }, [shareExistingAchievement, shareReadinessError, showDedicateShareOption]);

  const onManualShareCopied = useCallback(() => {
    setManualShareUrl(null);
    toast.success(ACHIEVEMENT_UI_COPY.shareInviteCopied, {
      id: "achievement-share-invite-copied",
    });
  }, []);

  return {
    shareInviteBusy,
    manualShareUrl,
    setManualShareUrl,
    dedicateInviteConfirmOpen,
    setDedicateInviteConfirmOpen,
    showDedicateShareOption,
    showCollaborateShareOption,
    showEndCollaboration: detailAchievement?.collaboratorUserId != null,
    showShowcaseShareOption: !isShelfCollaborator,
    collaborationPartnerUserId,
    isShelfCollaborator,
    dedicateShareDisabledReason: shareReadinessError,
    collaborateShareDisabledReason: shareReadinessError,
    showcaseShareDisabledReason,
    shareShowcaseAchievement,
    shareDedicationInvite,
    shareCollaborateInvite,
    endCollaboration,
    requestDedicateInviteShare,
    confirmDedicateInviteShare,
    onManualShareCopied,
  };
}
