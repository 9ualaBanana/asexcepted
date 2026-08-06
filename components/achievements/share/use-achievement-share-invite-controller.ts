"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { ACHIEVEMENT_UI_COPY } from "@/components/achievements/share/achievement-ui-copy";
import { copyTextToClipboard } from "@/lib/copy-text-to-clipboard";
import {
  postCreateAchievementShareInvite as postShareAchievement,
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
  detailAchievement: AchievementViewModel | null;
  /** Called after a dedicate invite is created (sender copy removed server-side). */
  onReloadRequired: () => void;
};

export function useAchievementShareInviteController({
  detailAchievement,
  onReloadRequired,
}: UseAchievementShareInviteControllerArgs) {
  const [shareInviteBusy, setShareInviteBusy] = useState(false);
  const [manualShareUrl, setManualShareUrl] = useState<string | null>(null);
  const [dedicateInviteConfirmOpen, setDedicateInviteConfirmOpen] = useState(false);
  const dedicateRequestInFlightRef = useRef(false);

  const detailAchievementId = detailAchievement?.id ?? null;
  const detailTitle = detailAchievement?.title;
  const detailDescription = detailAchievement?.description;

  const showDedicateShareOption = useMemo(
    () =>
      detailAchievement
        ? canDedicateAchievementViaShareInvite(detailAchievement)
        : false,
    [detailAchievement],
  );

  const shareReadinessError = useMemo(() => {
    if (!detailAchievement) return null;
    return getAchievementShareReadinessError({
      icon_url: detailAchievement.iconUrl,
      icon_asset_kind: detailAchievement.model ? "model_glb" : "image",
      icon_asset_path: detailAchievement.model?.assetPath ?? null,
    });
  }, [detailAchievement]);

  const showcaseShareDisabledReason = shareReadinessError;

  const dedicateShareDisabledReason = useMemo(() => {
    if (!showDedicateShareOption) return null;
    return shareReadinessError;
  }, [shareReadinessError, showDedicateShareOption]);

  const shareExistingAchievement = useCallback(
    async (intent: AchievementShareInviteIntent) => {
      if (!detailAchievementId) return;
      if (intent === "dedicate") {
        if (dedicateRequestInFlightRef.current) return;
        dedicateRequestInFlightRef.current = true;
      }

      setShareInviteBusy(true);
      try {
        const shareInviteResult = await postShareAchievement({
          achievementId: detailAchievementId,
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
    [
      detailAchievementId,
      detailDescription,
      detailTitle,
      onReloadRequired,
    ],
  );

  const displayShareLink = useCallback(async (shareUrl: string) => {
    const nativeShareResult = await tryNativeShare({
      shareUrl,
      title: detailTitle,
      text: detailDescription,
    });
    if (nativeShareResult === "fallback") {
      await finishWithClipboardFallback(shareUrl);
    }
  }, [detailDescription, detailTitle]);

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
    if (showcaseShareDisabledReason) {
      showErrorToast(showcaseShareDisabledReason, {
        id: "achievement-showcase-not-ready",
      });
      return;
    }
    void shareExistingAchievement("showcase");
  }, [shareExistingAchievement, showcaseShareDisabledReason]);

  const shareDedicationInvite = useCallback(() => {
    void shareExistingAchievement("dedicate");
  }, [shareExistingAchievement]);

  const requestDedicateInviteShare = useCallback(() => {
    if (!showDedicateShareOption) return;
    if (dedicateShareDisabledReason) {
      showErrorToast(dedicateShareDisabledReason, {
        id: "achievement-dedicate-not-ready",
      });
      return;
    }
    setDedicateInviteConfirmOpen(true);
  }, [dedicateShareDisabledReason, showDedicateShareOption]);

  const confirmDedicateInviteShare = useCallback(() => {
    if (!showDedicateShareOption) {
      setDedicateInviteConfirmOpen(false);
      return;
    }
    if (dedicateShareDisabledReason) {
      showErrorToast(dedicateShareDisabledReason, {
        id: "achievement-dedicate-not-ready",
      });
      setDedicateInviteConfirmOpen(false);
      return;
    }
    setDedicateInviteConfirmOpen(false);
    void shareExistingAchievement("dedicate");
  }, [
    dedicateShareDisabledReason,
    shareExistingAchievement,
    showDedicateShareOption,
  ]);

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
    dedicateShareDisabledReason,
    showcaseShareDisabledReason,
    shareShowcaseAchievement,
    shareDedicationInvite,
    requestDedicateInviteShare,
    confirmDedicateInviteShare,
    onManualShareCopied,
  };
}
