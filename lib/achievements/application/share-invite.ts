import "server-only";

import { err, ok, type Result } from "neverthrow";

import {
  createAchievementPort,
  createShareInvitePort,
} from "@/lib/achievements/application/adapters";
import type {
  AchievementPort,
  ShareInvitePort,
} from "@/lib/achievements/application/ports";
import {
  BADGE_MODEL_BUCKET,
  BADGE_PREVIEW_BUCKET,
  buildShareInviteBadgeModelPath,
  buildShareInviteBadgePreviewPath,
  isModelBadgeAssetKind,
  isShareInviteBadgeModelPath,
} from "@/lib/achievements/badge/shared/badge-assets";
import { resolveClaimedBadgeIconFields } from "@/lib/achievements/badge/shared/badge-assets-server";
import {
  parseAchievement,
  type Achievement,
  type AchievementCreate,
} from "@/lib/achievements/domain/achievement";
import {
  DEFAULT_ACHIEVEMENT_ICON_KEY,
  DEFAULT_ACHIEVEMENT_TONE,
  type AchievementIconKey,
  type AchievementTone,
  type IconAssetKind,
} from "@/lib/achievements/domain/enums";
import {
  achievementShareInviteCreateV2Schema,
  type AchievementShareInviteCreate,
  type AchievementSharePageKind,
} from "@/lib/achievements/domain/share-invite";
import { insertClaimedAchievementFromInvite } from "@/lib/achievements/persistence/dedications";
import type { AchievementShareInvitePresentation } from "@/lib/achievements/presentation/share-invite-view-models";
import { todayDateString } from "@/lib/feed/format-feed-event-time";
import { notifyCollaborationJoined } from "@/lib/notifications/collaboration-joined";
import { notifyDedicationAccepted } from "@/lib/notifications/dedication-accepted";
import { fetchPublicUserDisplayName } from "@/lib/profile/follow";
import { userAchievementDetail } from "@/lib/routes";
import { validateShareInviteBadgeSnapshot } from "@/lib/share-invites/eligibility";
import { createAchievementShareInviteToken } from "@/lib/share-invites/token";
import type { ServiceRoleSupabaseClient } from "@/lib/supabase/clients/client-types";
import { createServiceRoleSupabase } from "@/lib/supabase/clients/server";

export type AchievementShareInviteIntent = "showcase" | "dedicate" | "collaborate";

export type CreateShareInviteSuccess = {
  inviteId: string;
  token: string;
  snapshot: Achievement;
};

export type ClaimAchievementShareInviteSuccess = {
  achievementId: string;
  redirectPath: string;
};

export type ShareInviteUseCasePorts = {
  achievements: AchievementPort;
  shareInvites: ShareInvitePort;
  supabase: ServiceRoleSupabaseClient;
};

function defaultShareInviteUseCasePorts(): ShareInviteUseCasePorts {
  const supabase = createServiceRoleSupabase();
  return {
    achievements: createAchievementPort(supabase),
    shareInvites: createShareInvitePort(supabase),
    supabase,
  };
}

export async function createAchievementShareInvite(
  args: {
    senderUserId: string;
    achievementId: string;
    intent: AchievementShareInviteIntent;
  },
  ports: ShareInviteUseCasePorts = defaultShareInviteUseCasePorts(),
): Promise<Result<CreateShareInviteSuccess, string>> {
  const achievementResult = await ports.achievements.get(args.achievementId);
  if (achievementResult.isErr()) {
    return err(achievementResult.error);
  }
  const achievement = achievementResult.value;

  const canShareResult = canBeShared(achievement, args);
  if (canShareResult.isErr()) {
    return err(canShareResult.error);
  }

  const inviteResult = await insertShareInviteWithSnapshot(
    {
      senderUserId: args.senderUserId,
      achievement,
      shareKind: shareKindForIntent(args.intent),
    },
    ports,
  );
  if (inviteResult.isErr()) {
    return inviteResult;
  }
  if (args.intent === "showcase" || args.intent === "collaborate") {
    return inviteResult;
  }
  const invite = inviteResult.value;

  if (isModelBadgeAssetKind(invite.snapshot.icon_asset_kind)) {
    const pinnedPath = invite.snapshot.icon_asset_path;
    if (!pinnedPath || !isShareInviteBadgeModelPath(pinnedPath)) {
      const rollbackResult = await deleteShareInviteAndAssets(
        invite.inviteId,
        ports,
      );
      return err(
        rollbackResult.isErr()
          ? rollbackResult.error
          : "The 3D badge could not be prepared for this invite. Wait for the model to finish uploading, then try again.",
      );
    }
  }

  const removed = await ports.achievements.deleteForOwner(
    achievement.id,
    args.senderUserId,
  );
  if (removed.isErr()) {
    return err(removed.error);
  }

  return ok(invite);
}

export async function getSharedAchievement(
  token: string,
  ports: ShareInviteUseCasePorts = defaultShareInviteUseCasePorts(),
): Promise<Result<AchievementShareInvitePresentation, string>> {
  const inviteResult = await ports.shareInvites.getV2(token);
  if (inviteResult.isErr()) {
    return presentDedicateInvite(token, ports);
  }
  const invite = inviteResult.value;

  const snapshotResult = await ports.achievements.get(
    invite.source_achievement_id,
  );
  if (snapshotResult.isErr()) {
    return err(snapshotResult.error);
  }
  const snapshot = snapshotResult.value;

  const senderNameResult = await fetchPublicUserDisplayName(
    ports.supabase,
    invite.sender_user_id,
  );
  const senderDisplayName = senderNameResult.isOk()
    ? senderNameResult.value
    : "Someone";

  const ownerUserId = snapshot.user_id;
  const ownerNameResult = await fetchPublicUserDisplayName(
    ports.supabase,
    ownerUserId,
  );
  const ownerDisplayName = ownerNameResult.isOk()
    ? ownerNameResult.value
    : "Someone";

  return ok({
    invite,
    snapshot,
    senderDisplayName,
    ownerUserId,
    ownerDisplayName,
  });
}

export async function claimAchievementShareInvite(
  args: {
    token: string;
    claimerUserId: string;
    autoAccept: boolean;
  },
  ports: ShareInviteUseCasePorts = defaultShareInviteUseCasePorts(),
): Promise<Result<ClaimAchievementShareInviteSuccess, string>> {
  const claimedAt = new Date().toISOString();
  const collaborateResult = await claimCollaborationInvite(args, ports);
  if (collaborateResult !== null) {
    return collaborateResult;
  }

  const reservedInviteResult = await ports.shareInvites.reserveClaim(
    args.claimerUserId,
    args.token,
    claimedAt,
  );
  if (reservedInviteResult.isErr()) {
    return err(reservedInviteResult.error);
  }
  const reservedInvite = reservedInviteResult.value;

  if (reservedInvite.share_kind === "showcase") {
    const rollbackResult = await ports.shareInvites.releaseClaim(
      reservedInvite.id,
    );
    if (rollbackResult.isErr()) {
      return err(rollbackResult.error);
    }
    return err("This shared achievement is showcase-only.");
  }
  if (reservedInvite.sender_user_id === args.claimerUserId) {
    const rollbackResult = await ports.shareInvites.releaseClaim(
      reservedInvite.id,
    );
    if (rollbackResult.isErr()) {
      return err(rollbackResult.error);
    }
    return err("You cannot claim your own invite.");
  }

  const achievedAt = reservedInvite.achieved_at ?? todayDateString();
  const dedicationStatus = args.autoAccept ? "accepted" : "pending";

  let claimedIconUrl = reservedInvite.icon_url?.trim() ?? "";
  let claimedIconAssetPath = reservedInvite.icon_asset_path;

  try {
    const resolvedIcon = await resolveClaimedBadgeIconFields({
      senderUserId: reservedInvite.sender_user_id,
      claimerUserId: args.claimerUserId,
      iconUrl: reservedInvite.icon_url,
      iconAssetKind: reservedInvite.icon_asset_kind,
      iconAssetPath: reservedInvite.icon_asset_path,
    });
    claimedIconUrl = resolvedIcon.iconUrl;
    claimedIconAssetPath = resolvedIcon.iconAssetPath;
  } catch (cloneError) {
    const rollbackResult = await ports.shareInvites.releaseClaim(
      reservedInvite.id,
    );
    if (rollbackResult.isErr()) {
      return err(rollbackResult.error);
    }
    return err(
      cloneError instanceof Error
        ? cloneError.message
        : "Could not copy the shared 3D badge for your collection.",
    );
  }

  const claimedAchievement: AchievementCreate = {
    user_id: args.claimerUserId,
    title: reservedInvite.title,
    description: reservedInvite.description,
    category: reservedInvite.category,
    icon: (reservedInvite.icon ??
      DEFAULT_ACHIEVEMENT_ICON_KEY) as AchievementIconKey,
    icon_url: claimedIconUrl,
    icon_file_id: reservedInvite.icon_file_id,
    icon_asset_kind: (reservedInvite.icon_asset_kind ??
      "image") as IconAssetKind,
    icon_asset_path: claimedIconAssetPath,
    icon_model_yaw: reservedInvite.icon_model_yaw ?? 0,
    icon_model_pitch: reservedInvite.icon_model_pitch ?? 0,
    tone: (reservedInvite.tone ?? DEFAULT_ACHIEVEMENT_TONE) as AchievementTone,
    is_locked: true,
    achieved_at: achievedAt,
    visibility: "public",
    dedicated_by_user_id: reservedInvite.sender_user_id,
    dedication_status: dedicationStatus,
    origin_url: reservedInvite.origin_url,
  };
  const createResult = await insertClaimedAchievementFromInvite(
    ports.supabase,
    claimedAchievement,
  );

  if (createResult.isErr()) {
    const rollbackResult = await ports.shareInvites.releaseClaim(
      reservedInvite.id,
    );
    if (rollbackResult.isErr()) {
      return err(rollbackResult.error);
    }
    return err(createResult.error);
  }
  const createdAchievement = createResult.value;

  const claimResult = await ports.shareInvites.completeClaim(
    reservedInvite.id,
    createdAchievement.id,
    args.claimerUserId,
    claimedAt,
  );
  if (claimResult.isErr()) {
    const rollbackResult = await ports.shareInvites.releaseClaim(
      reservedInvite.id,
    );
    if (rollbackResult.isErr()) {
      return err(rollbackResult.error);
    }
    return err(claimResult.error);
  }

  if (args.autoAccept) {
    await notifyDedicationAccepted(createdAchievement.id);
  }

  return ok({
    achievementId: createdAchievement.id,
    redirectPath: userAchievementDetail(
      args.claimerUserId,
      createdAchievement.id,
      !args.autoAccept,
    ),
  });
}

function canBeShared(
  achievement: Achievement,
  args: {
    senderUserId: string;
    intent: AchievementShareInviteIntent;
  },
): Result<void, string> {
  const achievementOwner = achievement.user_id;
  const isSharedByOwner = achievementOwner === args.senderUserId;

  if (!isSharedByOwner) {
    if (args.intent !== "showcase") {
      return err("You can only dedicate achievements from your own collection.");
    }
    if (achievement.visibility !== "public") {
      return err("Only public achievements can be shared as showcase.");
    }
  } else if (achievement.dedicated_by_user_id) {
    return err("Dedicated achievements cannot be re-shared.");
  } else if (args.intent === "collaborate") {
    if (achievement.collaborator_user_id) {
      return err("This achievement already has a collaborator.");
    }
  }
  return ok();
}

export async function endAchievementCollaboration(
  args: {
    actorUserId: string;
    achievementId: string;
  },
  ports: ShareInviteUseCasePorts = defaultShareInviteUseCasePorts(),
): Promise<Result<void, string>> {
  const cleared = await ports.achievements.clearCollaborator(
    args.achievementId,
    args.actorUserId,
  );
  if (cleared.isErr()) {
    return err(cleared.error);
  }
  return ok(undefined);
}

function shareKindForIntent(
  intent: AchievementShareInviteIntent,
): AchievementSharePageKind {
  if (intent === "showcase") return "showcase";
  if (intent === "collaborate") return "collaborate";
  return "invite";
}

async function presentDedicateInvite(
  token: string,
  ports: ShareInviteUseCasePorts,
): Promise<Result<AchievementShareInvitePresentation, string>> {
  const inviteResult = await ports.shareInvites.get(token);
  if (inviteResult.isErr()) {
    return err(inviteResult.error);
  }
  const row = inviteResult.value;
  const inviteParsed = achievementShareInviteCreateV2Schema.safeParse({
    id: row.id,
    sender_user_id: row.sender_user_id,
    source_achievement_id: row.source_achievement_id ?? row.id,
    share_kind: row.share_kind,
    token_hash: row.token_hash,
    status: row.status,
  });
  if (!inviteParsed.success) {
    return err("Could not find the share invite.");
  }
  const snapshotResult = achievementFromDedicateInvite(row);
  if (snapshotResult.isErr()) {
    return err(snapshotResult.error);
  }

  const senderNameResult = await fetchPublicUserDisplayName(
    ports.supabase,
    row.sender_user_id,
  );
  const senderDisplayName = senderNameResult.isOk()
    ? senderNameResult.value
    : "Someone";

  return ok({
    invite: inviteParsed.data,
    snapshot: snapshotResult.value,
    senderDisplayName,
    ownerUserId: row.sender_user_id,
    ownerDisplayName: senderDisplayName,
  });
}

function achievementFromDedicateInvite(
  row: AchievementShareInviteCreate,
): Result<Achievement, string> {
  return parseAchievement({
    id: row.id,
    user_id: row.sender_user_id,
    title: row.title,
    origin_url: row.origin_url,
    description: row.description,
    category: row.category,
    icon: row.icon,
    icon_url: row.icon_url,
    icon_file_id: row.icon_file_id,
    icon_asset_kind: row.icon_asset_kind,
    icon_asset_path: row.icon_asset_path,
    icon_model_yaw: row.icon_model_yaw ?? 0,
    icon_model_pitch: row.icon_model_pitch ?? 0,
    icon_model_animation_play: true,
    icon_model_animation_speed: 1,
    tone: row.tone ?? DEFAULT_ACHIEVEMENT_TONE,
    is_locked: true,
    achieved_at: row.achieved_at,
    created_at: new Date().toISOString(),
    visibility: "public",
    dedicated_by_user_id: row.sender_user_id,
    dedication_status: "pending",
    collaborator_user_id: null,
  });
}

async function claimCollaborationInvite(
  args: {
    token: string;
    claimerUserId: string;
  },
  ports: ShareInviteUseCasePorts,
): Promise<Result<ClaimAchievementShareInviteSuccess, string> | null> {
  const inviteResult = await ports.shareInvites.getV2(args.token);
  if (inviteResult.isErr()) {
    return null;
  }
  if (inviteResult.value.share_kind !== "collaborate") {
    return null;
  }
  const invite = inviteResult.value;
  if (invite.status !== "pending") {
    return err("This invite is no longer available.");
  }
  if (invite.sender_user_id === args.claimerUserId) {
    return err("You cannot claim your own invite.");
  }

  const claimed = await ports.shareInvites.claimCollaboration(invite.id);
  if (claimed.isErr()) {
    return err(claimed.error);
  }

  const attached = await ports.achievements.setCollaborator(
    invite.source_achievement_id,
    args.claimerUserId,
  );
  if (attached.isErr()) {
    await ports.shareInvites.releaseCollaboration(invite.id);
    return err(attached.error);
  }

  await notifyCollaborationJoined({
    achievementId: invite.source_achievement_id,
    claimerUserId: args.claimerUserId,
    senderUserId: invite.sender_user_id,
  });

  return ok({
    achievementId: invite.source_achievement_id,
    redirectPath: userAchievementDetail(
      args.claimerUserId,
      invite.source_achievement_id,
      false,
    ),
  });
}

async function insertShareInviteWithSnapshot(
  args: {
    senderUserId: string;
    achievement: Achievement;
    shareKind: AchievementSharePageKind;
  },
  ports: ShareInviteUseCasePorts,
): Promise<Result<CreateShareInviteSuccess, string>> {
  const achievementValidation = validateShareInviteBadgeSnapshot(
    args.achievement,
  );
  if (achievementValidation.isErr()) {
    return err(achievementValidation.error);
  }

  const token = createAchievementShareInviteToken();
  const writeInvite =
    args.shareKind === "invite"
      ? ports.shareInvites.create
      : ports.shareInvites.createV2;
  const shareInviteResult = await writeInvite({
    senderUserId: args.senderUserId,
    snapshot: args.achievement,
    shareKind: args.shareKind,
    token,
  });
  if (shareInviteResult.isErr()) {
    return err(shareInviteResult.error);
  }

  return ok({
    inviteId: shareInviteResult.value.inviteId,
    token,
    snapshot: args.achievement,
  });
}

async function deleteShareInviteAndAssets(
  inviteId: string,
  ports: ShareInviteUseCasePorts,
): Promise<Result<void, string>> {
  const rollbackResult = await ports.shareInvites.delete(inviteId);
  if (rollbackResult.isErr()) {
    return rollbackResult;
  }
  const modelPath = buildShareInviteBadgeModelPath(inviteId);
  const previewPath = buildShareInviteBadgePreviewPath(inviteId);
  await ports.supabase.storage.from(BADGE_MODEL_BUCKET).remove([modelPath]);
  await ports.supabase.storage.from(BADGE_PREVIEW_BUCKET).remove([previewPath]);
  return ok();
}
