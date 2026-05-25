"use client";

import { useCallback, useEffect, useState } from "react";

import {
  ACHIEVEMENT_UI_COPY,
  ACHIEVEMENT_UI_HINT_MS,
} from "@/components/achievements/achievement-ui-copy";
import { copyTextToClipboard } from "@/lib/copy-text-to-clipboard";
import { toast } from "@/lib/toast";
import { requestEmbedBadgeToken } from "@/lib/embed-api-client";

type UseAchievementEmbedLinkControllerArgs = {
  detailAchievementId: string | null;
};

/**
 * Handles embed-link generation + copy UX state for achievement detail.
 */
export function useAchievementEmbedLinkController({
  detailAchievementId,
}: UseAchievementEmbedLinkControllerArgs) {
  const [embedCopyBusy, setEmbedCopyBusy] = useState(false);
  const [embedCopyHint, setEmbedCopyHint] = useState<string | null>(null);
  const [manualEmbedUrl, setManualEmbedUrl] = useState<string | null>(null);

  useEffect(() => {
    setEmbedCopyHint(null);
    setManualEmbedUrl(null);
  }, [detailAchievementId]);

  const copyEmbedLink = useCallback(async () => {
    if (!detailAchievementId) return;
    setEmbedCopyBusy(true);
    setEmbedCopyHint(null);
    let embedUrlForFallback = "";

    try {
      const tokenResult = await requestEmbedBadgeToken(detailAchievementId);
      if (tokenResult.isErr()) {
        setEmbedCopyHint(tokenResult.error);
        return;
      }

      const { embedUrl } = tokenResult.value;
      embedUrlForFallback = embedUrl;
      const copied = await copyTextToClipboard(embedUrl);
      if (!copied) {
        setManualEmbedUrl(embedUrl);
        setEmbedCopyHint(ACHIEVEMENT_UI_COPY.embedCopyBlockedManual);
        window.setTimeout(() => setEmbedCopyHint(null), ACHIEVEMENT_UI_HINT_MS.embedCopyBlocked);
        return;
      }

      toast.success(ACHIEVEMENT_UI_COPY.embedCopied, { id: "achievement-embed-copied" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : ACHIEVEMENT_UI_COPY.embedCopyUnknownError;
      if (/not allowed|denied permission|permission/i.test(msg)) {
        if (embedUrlForFallback) {
          setManualEmbedUrl(embedUrlForFallback);
        }
        setEmbedCopyHint(ACHIEVEMENT_UI_COPY.embedClipboardPermissionBlocked);
      } else {
        setEmbedCopyHint(msg);
      }
    } finally {
      setEmbedCopyBusy(false);
    }
  }, [detailAchievementId]);

  const onManualEmbedCopied = useCallback(() => {
    setManualEmbedUrl(null);
    toast.success(ACHIEVEMENT_UI_COPY.embedCopied, { id: "achievement-embed-copied" });
  }, []);

  return {
    embedCopyBusy,
    embedCopyHint,
    manualEmbedUrl,
    setManualEmbedUrl,
    copyEmbedLink,
    onManualEmbedCopied,
  };
}
