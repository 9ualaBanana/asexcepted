import type {
  AchievementPort,
  DedicationPort,
  EmbedPort,
  FeedPort,
  ImpressionPort,
  ShareInvitePort,
} from "@/lib/achievements/application/ports";
import {
  createAchievement,
  deleteAchievement,
  getAchievementEmbedBadgeSource,
  getAchievementEmbedMintSource,
  listAchievements,
  unlockAchievement,
  updateAchievement,
  getAchievement,
  getAchievementIdForOwner,
  deleteAchievementForOwner,
  getAchievementOwnerUserId,
  setAchievementCollaborator,
  clearAchievementCollaborator,
} from "@/lib/achievements/persistence/achievements";
import {
  acceptPendingDedicationForRecipient,
  listPendingDedications as listPendingDedicationRows,
  rejectDedication,
} from "@/lib/achievements/persistence/dedications";
import { fetchFollowingUnlockFeed } from "@/lib/achievements/persistence/feed";
import type {
  DatabaseSupabaseClient,
  RlsScopedSupabaseClient,
  ServiceRoleSupabaseClient,
} from "@/lib/supabase/clients/client-types";
import { createImpression, fetchCountMap } from "@/lib/achievements/persistence/impressions";
import { completeShareInviteClaim, createShareInvite, deleteShareInvite, getAchievementShareInviteByToken, reserveShareInviteClaim, releaseShareInviteClaim, createShareInviteV2, getAchievementShareInviteByTokenV2, claimCollaborationShareInvite, releaseCollaborationShareInvite } from "@/lib/achievements/persistence/share-invite";

export function createAchievementPort(
  supabase: DatabaseSupabaseClient,
): AchievementPort {
  return {
    list: (userId) => listAchievements(supabase, userId),
    get: (achievementId) => getAchievement(supabase, achievementId),
    getAchievementIdForOwner: (achievementId, ownerUserId) => getAchievementIdForOwner(supabase, achievementId, ownerUserId),
    getAchievementOwnerUserId: (achievementId) => getAchievementOwnerUserId(supabase, achievementId),
    create: (command) => createAchievement(supabase, command),
    update: (id, command) => updateAchievement(supabase, id, command),
    delete: (id) => deleteAchievement(supabase, id),
    deleteForOwner: (id, ownerUserId) => deleteAchievementForOwner(supabase, id, ownerUserId),
    unlock: (id) => unlockAchievement(supabase, id),
    setCollaborator: (achievementId, collaboratorUserId) =>
      setAchievementCollaborator(supabase, achievementId, collaboratorUserId),
    clearCollaborator: (achievementId, actorUserId) =>
      clearAchievementCollaborator(supabase, achievementId, actorUserId),
  };
}

export function createShareInvitePort(supabase: ServiceRoleSupabaseClient): ShareInvitePort {
  return {
    get: (token) => getAchievementShareInviteByToken(supabase, token),
    getV2: (token) => getAchievementShareInviteByTokenV2(supabase, token),
    create: (args) => createShareInvite(supabase, args),
    createV2: (args) => createShareInviteV2(supabase, args),
    delete: (inviteId) => deleteShareInvite(supabase, inviteId),
    reserveClaim: (claimerUserId, token, claimedAt) => reserveShareInviteClaim(supabase, claimerUserId, token, claimedAt),
    releaseClaim: (inviteId) => releaseShareInviteClaim(supabase, inviteId),
    completeClaim: (inviteId, claimedAchievementId, claimedByUserId, claimedAt) => completeShareInviteClaim(supabase, inviteId, claimedAchievementId, claimedByUserId, claimedAt),
    claimCollaboration: (inviteId) => claimCollaborationShareInvite(supabase, inviteId),
    releaseCollaboration: (inviteId) => releaseCollaborationShareInvite(supabase, inviteId),
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
