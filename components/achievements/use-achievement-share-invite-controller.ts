"use client";

import { useCallback, useState } from "react";

import { ACHIEVEMENT_UI_COPY } from "@/components/achievements/achievement-ui-copy";
import type { AchievementDbWritePayload } from "@/components/achievements/achievement-db-schema";
import { copyTextToClipboard } from "@/lib/copy-text-to-clipboard";
import { postCreateAchievementShareInvite } from "@/lib/share-invites/share-invite-api";
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
};

export function useAchievementShareInviteController({
  detailAchievementId,
  detailTitle,
  detailDescription,
}: UseAchievementShareInviteControllerArgs) {
  const [shareInviteBusy, setShareInviteBusy] = useState(false);
  const [manualShareUrl, setManualShareUrl] = useState<string | null>(null);

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

  const shareExistingAchievement = useCallback(async () => {
    if (!detailAchievementId) return;

    setShareInviteBusy(true);
    try {
      const inviteResult = await postCreateAchievementShareInvite({
        mode: "existing",
        achievementId: detailAchievementId,
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
    } catch (error) {
      showErrorToast(
        error instanceof Error ? error.message : ACHIEVEMENT_UI_COPY.shareInviteUnknownError,
        { id: "achievement-share-invite-existing" },
      );
    } finally {
      setShareInviteBusy(false);
    }
  }, [detailAchievementId, detailDescription, detailTitle, finishWithClipboardFallback]);

  const shareDraftAchievement = useCallback(
    async (payload: AchievementDbWritePayload) => {
      if (!payload.icon_url?.trim()) {
        showErrorToast(ACHIEVEMENT_UI_COPY.shareInviteCreateOnlyCustomImage, {
          id: "achievement-share-invite-custom-image-only",
        });
        return;
      }

      setShareInviteBusy(true);
      try {
        const inviteResult = await postCreateAchievementShareInvite({
          mode: "draft",
          payload,
        });

        if (inviteResult.isErr()) {
          showErrorToast(inviteResult.error, { id: "achievement-share-invite-draft" });
          return;
        }

        const shareUrl = inviteResult.value.shareUrl;
        const nativeShare = await tryNativeShare({
          shareUrl,
          title: payload.title,
          text: payload.description,
        });

        if (nativeShare === "fallback") {
          await finishWithClipboardFallback(shareUrl);
        }
      } catch (error) {
        showErrorToast(
          error instanceof Error ? error.message : ACHIEVEMENT_UI_COPY.shareInviteUnknownError,
          { id: "achievement-share-invite-draft-unknown" },
        );
      } finally {
        setShareInviteBusy(false);
      }
    },
    [finishWithClipboardFallback],
  );

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
    shareExistingAchievement,
    shareDraftAchievement,
    onManualShareCopied,
  };
}

