"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { AchievementRecord } from "@/components/achievements/achievement-transformers";
import {
  listPendingDedications,
  rejectDedication,
} from "@/lib/dedications/dedication-db";
import { fetchPublicUserDisplayName } from "@/lib/user-profile-db";
import { createClient } from "@/lib/supabase/client";
import { userCollection } from "@/lib/routes";
import { showErrorToast } from "@/lib/toast";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type UseDedicationQueueControllerArgs = {
  ownerUserId: string;
  readOnly: boolean;
  /** Accepted / in-grid achievements (not pending dedication). */
  collectionAchievementIds: Set<string>;
  onAccepted: (record: AchievementRecord) => void;
  onRejected: (achievementId: string) => void;
  reloadAchievements: () => Promise<void>;
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
  const supabase = createClient();

  const [queue, setQueue] = useState<AchievementRecord[]>([]);
  const [active, setActive] = useState<AchievementRecord | null>(null);
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
    const result = await listPendingDedications(supabase, ownerUserId);
    if (result.isOk()) {
      setQueue(result.value);
    }
  }, [ownerUserId, readOnly, supabase]);

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
    if (!active?.dedicated_by_user_id) return;
    void fetchPublicUserDisplayName(supabase, active.dedicated_by_user_id).then(
      (result) => {
        if (result.isOk() && result.value) {
          setSenderName(result.value);
        }
      },
    );
  }, [active?.dedicated_by_user_id, supabase]);

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
    setBusy(true);
    try {
      const response = await fetch("/api/achievements/dedication/accept", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ achievementId: active.id }),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        achievement?: AchievementRecord;
      } | null;

      if (!response.ok || !data?.achievement) {
        throw new Error(data?.error ?? "Could not accept this dedication.");
      }

      onAccepted(data.achievement);
      advanceQueue(active.id);
      clearDedicationQuery();
      await reloadAchievements();
    } catch (error) {
      showErrorToast(
        error instanceof Error ? error.message : "Could not accept this dedication.",
        { id: "dedication-accept" },
      );
    }
    setBusy(false);
  }, [
    active,
    advanceQueue,
    clearDedicationQuery,
    onAccepted,
    reloadAchievements,
  ]);

  const handleReject = useCallback(async () => {
    if (!active) return;
    setBusy(true);
    const id = active.id;
    const result = await rejectDedication(supabase, id);
    if (result.isOk()) {
      onRejected(id);
      advanceQueue(id);
      clearDedicationQuery();
    }
    setBusy(false);
  }, [active, advanceQueue, clearDedicationQuery, onRejected, supabase]);

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
