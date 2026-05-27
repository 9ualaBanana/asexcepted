"use client";

import { useCallback, useRef, useState } from "react";

import { ACHIEVEMENT_UI_COPY } from "@/components/achievements/achievement-ui-copy";
import { copyTextToClipboard } from "@/lib/copy-text-to-clipboard";
import {
  postCreateAchievementShareInvite,
  type AchievementShareInviteIntent,
} from "@/lib/share-invites/share-invite-api";
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
  detailAchievementId: string | null;
  detailTitle?: string | null;
  detailDescription?: string | null;
  /** Called after a dedicate invite is created (sender copy removed server-side). */
  onDedicateInviteShared?: () => void;
};

export function useAchievementShareInviteController({
  detailAchievementId,
  detailTitle,
  detailDescription,
  onDedicateInviteShared,
}: UseAchievementShareInviteControllerArgs) {
  const [shareInviteBusy, setShareInviteBusy] = useState(false);
  const [manualShareUrl, setManualShareUrl] = useState<string | null>(null);
  const dedicateRequestInFlightRef = useRef(false);

  const finishWithClipboardFallback = useCallback(async (shareUrl: string) => {
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
  }, []);

  const shareExistingAchievement = useCallback(
    async (intent: AchievementShareInviteIntent) => {
      if (!detailAchievementId) return;
      if (intent === "dedicate") {
        if (dedicateRequestInFlightRef.current) return;
        dedicateRequestInFlightRef.current = true;
      }

      setShareInviteBusy(true);
      try {
        const inviteResult = await postCreateAchievementShareInvite({
          mode: "existing",
          achievementId: detailAchievementId,
          intent,
        });

        if (inviteResult.isErr()) {
          showErrorToast(inviteResult.error, { id: "achievement-share-invite-create" });
          return;
        }

        const shareUrl = inviteResult.value.shareUrl;
        const nativeShare = await tryNativeShare({
          shareUrl,
          title: detailTitle,
          text: detailDescription,
        });

        if (nativeShare === "fallback") {
          await finishWithClipboardFallback(shareUrl);
        }

        if (intent === "dedicate") {
          onDedicateInviteShared?.();
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
      finishWithClipboardFallback,
      onDedicateInviteShared,
    ],
  );

  const shareShowcaseAchievement = useCallback(() => {
    void shareExistingAchievement("showcase");
  }, [shareExistingAchievement]);

  const shareDedicationInvite = useCallback(() => {
    void shareExistingAchievement("dedicate");
  }, [shareExistingAchievement]);

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
    shareShowcaseAchievement,
    shareDedicationInvite,
    onManualShareCopied,
  };
}
