"use client";

import { useCallback, useEffect, useState } from "react";

import { copyTextToClipboard } from "@/lib/copy-text-to-clipboard";
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
        setEmbedCopyHint("Copy was blocked. Use the manual copy sheet below.");
        window.setTimeout(() => setEmbedCopyHint(null), 3000);
        return;
      }

      setEmbedCopyHint("Embed link copied.");
      window.setTimeout(() => setEmbedCopyHint(null), 2500);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not copy link.";
      if (/not allowed|denied permission|permission/i.test(msg)) {
        if (embedUrlForFallback) {
          setManualEmbedUrl(embedUrlForFallback);
        }
        setEmbedCopyHint(
          "Clipboard permission was blocked. Use the manual copy sheet below.",
        );
      } else {
        setEmbedCopyHint(msg);
      }
    } finally {
      setEmbedCopyBusy(false);
    }
  }, [detailAchievementId]);

  const onManualEmbedCopied = useCallback(() => {
    setEmbedCopyHint("Embed link copied.");
    setManualEmbedUrl(null);
    window.setTimeout(() => setEmbedCopyHint(null), 2500);
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
