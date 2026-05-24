"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import type { AchievementRecord } from "@/components/achievements/achievement-transformers";
import {
  acceptDedication,
  listPendingDedications,
  rejectDedication,
} from "@/lib/dedications/dedication-db";
import { fetchPublicUserDisplayName } from "@/lib/user-profile-db";
import { createClient } from "@/lib/supabase/client";
import { userCollection } from "@/lib/routes";

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
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [queue, setQueue] = useState<AchievementRecord[]>([]);
  const [active, setActive] = useState<AchievementRecord | null>(null);
  const [senderName, setSenderName] = useState("Someone");
  const [busy, setBusy] = useState(false);
  const [queueSessionOpen, setQueueSessionOpen] = useState(false);
  const visitKeyRef = useRef("");

  const collectionPath = userCollection(ownerUserId);
  const onCollectionPage = pathname === collectionPath;

  const loadQueue = useCallback(async () => {
    if (readOnly) return;
    const result = await listPendingDedications(supabase, ownerUserId);
    if (result.isOk()) {
      setQueue(result.value);
    }
  }, [ownerUserId, readOnly, supabase]);

  useEffect(() => {
    if (readOnly || !onCollectionPage) return;
    if (visitKeyRef.current !== pathname) {
      visitKeyRef.current = pathname;
      setQueueSessionOpen(true);
      setActive(null);
    }
  }, [onCollectionPage, pathname, readOnly]);

  useEffect(() => {
    if (!onCollectionPage) return;
    void loadQueue();
  }, [loadQueue, onCollectionPage]);

  useEffect(() => {
    if (readOnly || !onCollectionPage || !queueSessionOpen || active || queue.length === 0) {
      return;
    }
    const dedicationParam = searchParams.get("dedication");
    const targetId = searchParams.get("achievement")?.trim() ?? "";

    if (dedicationParam === "1" && targetId) {
      if (collectionAchievementIds.has(targetId)) {
        return;
      }
      const match = queue.find((item) => item.id === targetId);
      if (match) {
        setActive(match);
        return;
      }
      return;
    }

    setActive(queue[0]);
  }, [
    active,
    collectionAchievementIds,
    onCollectionPage,
    queue,
    queueSessionOpen,
    readOnly,
    searchParams,
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
    setActive(null);
    setQueueSessionOpen(false);
  }, []);

  const advanceQueue = useCallback(
    (removedId: string) => {
      setQueue((prev) => {
        const next = prev.filter((item) => item.id !== removedId);
        if (queueSessionOpen && next.length > 0) {
          setActive(next[0]);
        } else {
          setActive(null);
          setQueueSessionOpen(false);
        }
        return next;
      });
    },
    [queueSessionOpen],
  );

  const handleAccept = useCallback(async () => {
    if (!active) return;
    setBusy(true);
    const result = await acceptDedication(supabase, active.id);
    if (result.isOk()) {
      const accepted = { ...active, dedication_status: "accepted" as const };
      onAccepted(accepted);
      advanceQueue(active.id);
      await reloadAchievements();
    }
    setBusy(false);
  }, [active, advanceQueue, onAccepted, reloadAchievements, supabase]);

  const handleReject = useCallback(async () => {
    if (!active) return;
    setBusy(true);
    const id = active.id;
    const result = await rejectDedication(supabase, id);
    if (result.isOk()) {
      onRejected(id);
      advanceQueue(id);
    }
    setBusy(false);
  }, [active, advanceQueue, onRejected, supabase]);

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
