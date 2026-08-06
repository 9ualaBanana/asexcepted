import type {
  AchievementPort,
  DedicationPort,
  EmbedPort,
  FeedPort,
  ImpressionPort,
} from "@/lib/achievements/application/ports";
import {
  createAchievement as insertAchievementRow,
  deleteAchievement as deleteAchievementRow,
  getAchievementEmbedBadgeSource,
  getAchievementEmbedMintSource,
  listAchievements as listAchievementRows,
  unlockAchievement as unlockAchievementRow,
  updateAchievement as updateAchievementRow,
} from "@/lib/achievements/persistence/achievements";
import {
  acceptPendingDedicationForRecipient,
  listPendingDedications as listPendingDedicationRows,
  rejectDedication,
} from "@/lib/achievements/persistence/dedications";
import { fetchFollowingUnlockFeed } from "@/lib/achievements/persistence/feed";
import type { RlsScopedSupabaseClient } from "@/lib/supabase/clients/client-types";
import { createImpression, fetchCountMap } from "@/lib/achievements/persistence/impressions";

export function createAchievementPort(
  supabase: RlsScopedSupabaseClient,
): AchievementPort {
  return {
    list: (userId) => listAchievementRows(supabase, userId),
    create: (command) => insertAchievementRow(supabase, command),
    update: (id, command) => updateAchievementRow(supabase, id, command),
    delete: (id) => deleteAchievementRow(supabase, id),
    unlock: (id) => unlockAchievementRow(supabase, id),
  };
}

export function createDedicationPort(
  supabase: RlsScopedSupabaseClient,
): DedicationPort {
  return {
    listPending: (recipientUserId) =>
      listPendingDedicationRows(supabase, recipientUserId),
    accept: (achievementId, recipientUserId) =>
      acceptPendingDedicationForRecipient(
        supabase,
        achievementId,
        recipientUserId,
      ),
    reject: (achievementId) => rejectDedication(supabase, achievementId),
  };
}

export function createFeedPort(supabase: RlsScopedSupabaseClient): FeedPort {
  return {
    fetchFollowingUnlock: (options) =>
      fetchFollowingUnlockFeed(supabase, options),
  };
}

export function createEmbedPort(supabase: RlsScopedSupabaseClient): EmbedPort {
  return {
    getBadgeSource: (achievementId) =>
      getAchievementEmbedBadgeSource(supabase, achievementId),
    getMintSource: (achievementId, ownerUserId) =>
      getAchievementEmbedMintSource(supabase, achievementId, ownerUserId),
  };
}

export function createImpressionPort(supabase: RlsScopedSupabaseClient): ImpressionPort {
  return {
    create: (achievementId) => createImpression(supabase, achievementId),
    fetchCountMap: (achievementIds) => fetchCountMap(supabase, achievementIds),
  };
}
