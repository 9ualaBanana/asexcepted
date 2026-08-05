"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { postAcceptDedication } from "@/lib/achievements/client/dedication-api";
import {
  listPendingCollectionDedications,
  rejectPendingDedication,
} from "@/lib/achievements/application/dedication-queue";
import type {
  AchievementCollectionEntryViewModel,
  AchievementDetailViewModel,
} from "@/lib/achievements/presentation/collection-view-models";
import { fetchPublicUserDisplayName } from "@/lib/profile/follow";
import { createBrowserSupabase } from "@/lib/supabase/clients/browser";
import { userCollection } from "@/lib/routes";
import { showErrorToast } from "@/lib/toast";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type UseDedicationQueueControllerArgs = {
  ownerUserId: string;
  readOnly: boolean;
  /** Accepted / in-grid achievements (not pending dedication). */
  collectionAchievementIds: Set<string>;
  onAccepted: (detail: AchievementDetailViewModel) => void;
  onRejected: (achievementId: string) => void;
  reloadAchievements: (opts?: {
    silent?: boolean;
  }) => Promise<AchievementCollectionEntryViewModel[] | null>;
};

export function useDedicationQueueController({
  ownerUserId,
  readOnly,
  collectionAchievementIds,
  onAccepted,
  onRejected,
  reloadAchievements,
}: UseDedicationQueueControllerArgs) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createBrowserSupabase();

  const [queue, setQueue] = useState<AchievementDetailViewModel[]>([]);
  const [active, setActive] = useState<AchievementDetailViewModel | null>(null);
  const [senderName, setSenderName] = useState("Someone");
  const [busy, setBusy] = useState(false);
  const [queueSessionOpen, setQueueSessionOpen] = useState(false);
  const visitKeyRef = useRef("");
  const dismissedDeepLinkIdRef = useRef<string | null>(null);
  const deepLinkReloadedForRef = useRef<string | null>(null);

  const collectionPath = userCollection(ownerUserId);
  const onCollectionPage = pathname === collectionPath;

  const dedicationDeepLinkId = useMemo(() => {
    if (searchParams.get("dedication") !== "1") return null;
    const id = searchParams.get("achievement")?.trim() ?? "";
    return id && UUID_RE.test(id) ? id : null;
  }, [searchParams]);

  const loadQueue = useCallback(async () => {
    if (readOnly) return;
    const result = await listPendingCollectionDedications(ownerUserId);
    if (result.isOk()) {
      setQueue(result.value);
    }
  }, [ownerUserId, readOnly]);

  const clearDedicationQuery = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (params.get("dedication") !== "1") return;
    params.delete("dedication");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (readOnly || !onCollectionPage) return;
    if (visitKeyRef.current !== pathname) {
      visitKeyRef.current = pathname;
      setQueueSessionOpen(true);
      setActive(null);
      dismissedDeepLinkIdRef.current = null;
      deepLinkReloadedForRef.current = null;
    }
  }, [onCollectionPage, pathname, readOnly]);

  useEffect(() => {
    if (dedicationDeepLinkId && dedicationDeepLinkId !== dismissedDeepLinkIdRef.current) {
      dismissedDeepLinkIdRef.current = null;
      deepLinkReloadedForRef.current = null;
    }
  }, [dedicationDeepLinkId]);

  useEffect(() => {
    if (!onCollectionPage) return;
    void loadQueue();
  }, [loadQueue, onCollectionPage]);

  useEffect(() => {
    if (readOnly || !onCollectionPage) return;

    if (dedicationDeepLinkId) {
      if (collectionAchievementIds.has(dedicationDeepLinkId)) return;
      if (dismissedDeepLinkIdRef.current === dedicationDeepLinkId) return;

      const match = queue.find((item) => item.id === dedicationDeepLinkId);
      if (match) {
        setActive(match);
        setQueueSessionOpen(true);
        return;
      }

      if (deepLinkReloadedForRef.current !== dedicationDeepLinkId) {
        deepLinkReloadedForRef.current = dedicationDeepLinkId;
        void loadQueue();
      }
      return;
    }

    if (!queueSessionOpen || active || queue.length === 0) {
      return;
    }

    setActive(queue[0]);
  }, [
    active,
    collectionAchievementIds,
    dedicationDeepLinkId,
    loadQueue,
    onCollectionPage,
    queue,
    queueSessionOpen,
    readOnly,
  ]);

  useEffect(() => {
    if (!active?.dedicatedByUserId) return;
    void fetchPublicUserDisplayName(supabase, active.dedicatedByUserId).then(
      (result) => {
        if (result.isOk() && result.value) {
          setSenderName(result.value);
        }
      },
    );
  }, [active?.dedicatedByUserId, supabase]);

  const dismissActive = useCallback(() => {
    if (dedicationDeepLinkId) {
      dismissedDeepLinkIdRef.current = dedicationDeepLinkId;
      clearDedicationQuery();
    }
    setActive(null);
    setQueueSessionOpen(false);
  }, [clearDedicationQuery, dedicationDeepLinkId]);

  const advanceQueue = useCallback(
    (removedId: string) => {
      setQueue((prev) => {
        const next = prev.filter((item) => item.id !== removedId);
        if (queueSessionOpen && next.length > 0 && !dedicationDeepLinkId) {
          setActive(next[0]);
        } else {
          setActive(null);
          setQueueSessionOpen(false);
        }
        return next;
      });
    },
    [dedicationDeepLinkId, queueSessionOpen],
  );

  const handleAccept = useCallback(async () => {
    if (!active) return;
    const acceptedId = active.id;
    setBusy(true);
    let acceptedRecord: AchievementDetailViewModel | null = null;
    let acceptError: string | null = null;
    const acceptResult = await postAcceptDedication(acceptedId);
    if (acceptResult.isOk()) {
      if (acceptResult.value.kind === "accepted") {
        acceptedRecord = acceptResult.value.achievement;
        onAccepted(acceptedRecord);
      }
    } else {
      acceptError = acceptResult.error;
    }

    const refreshed = await reloadAchievements({ silent: true });
    void loadQueue();
    const acceptedInCollection =
      refreshed?.some((entry) => entry.detail.id === acceptedId) ?? false;
    if (acceptError && !acceptedInCollection) {
      showErrorToast(acceptError, { id: "dedication-accept" });
    }
    advanceQueue(acceptedId);
    clearDedicationQuery();
    setBusy(false);
  }, [
    active,
    advanceQueue,
    clearDedicationQuery,
    loadQueue,
    onAccepted,
    reloadAchievements,
  ]);

  const handleReject = useCallback(async () => {
    if (!active) return;
    setBusy(true);
    const id = active.id;
    const result = await rejectPendingDedication(id);
    if (result.isOk()) {
      onRejected(id);
      advanceQueue(id);
      clearDedicationQuery();
    }
    setBusy(false);
  }, [active, advanceQueue, clearDedicationQuery, onRejected]);

  return {
    dedicationDialogOpen: Boolean(active),
    dedicationAchievement: active,
    dedicationSenderName: senderName,
    dedicationBusy: busy,
    dismissDedicationDialog: dismissActive,
    acceptDedication: handleAccept,
    rejectDedication: handleReject,
    refreshDedicationQueue: loadQueue,
  };
}
