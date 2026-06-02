import {
  AbilityBuilder,
  createMongoAbility,
  type MongoAbility,
} from "@casl/ability";

import { isAdmin as checkIsAdmin } from "@/lib/admin";

export type AchievementAction =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "filterVisibility"
  | "dedicate"
  | "unlockViaHold"
  | "toggleLock"
  | "viewBadgeDebugMetrics";

export type AchievementSubject =
  | "Achievement"
  | "AchievementCollection"
  | "BadgeLock"
  | "BadgeDebugMetrics";

export type AchievementAbility = MongoAbility<
  [AchievementAction, AchievementSubject]
>;

/** Viewer/session facts for an achievements collection page; built once at the route boundary. */
export type AchievementAuthContext = {
  readOnly: boolean;
  isAdmin: boolean;
  canDedicate: boolean;
};

export type BuildAchievementAuthContextArgs = {
  isOwner: boolean;
  viewerUserId: string | null | undefined;
};

export function buildAchievementAuthContext({
  isOwner,
  viewerUserId,
}: BuildAchievementAuthContextArgs): AchievementAuthContext {
  const readOnly = !isOwner;
  const isAdmin = Boolean(viewerUserId && checkIsAdmin(viewerUserId));
  const canDedicate = isAdmin && !isOwner;
  return { readOnly, isAdmin, canDedicate };
}

/** Auth facts + CASL ability; safe on server (API routes) and client. */
export type AchievementAuthBundle = {
  auth: AchievementAuthContext;
  ability: AchievementAbility;
};

export function buildAchievementAuthBundle(
  args: BuildAchievementAuthContextArgs,
): AchievementAuthBundle {
  const auth = buildAchievementAuthContext(args);
  return { auth, ability: buildAchievementAbility(auth) };
}

export type AchievementPermissions = {
  canEditAchievements: boolean;
  canFilterVisibility: boolean;
  canDedicateAchievements: boolean;
  canUnlockViaHold: boolean;
  canToggleBadgeLock: boolean;
  canViewBadgeDebugMetrics: boolean;
};

export function getAchievementPermissions(
  ability: AchievementAbility,
): AchievementPermissions {
  return {
    canEditAchievements: ability.can("edit", "Achievement"),
    canFilterVisibility: ability.can("filterVisibility", "AchievementCollection"),
    canDedicateAchievements: ability.can("dedicate", "Achievement"),
    canUnlockViaHold: ability.can("unlockViaHold", "BadgeLock"),
    canToggleBadgeLock: ability.can("toggleLock", "BadgeLock"),
    canViewBadgeDebugMetrics: ability.can("viewBadgeDebugMetrics", "BadgeDebugMetrics"),
  };
}

export function buildAchievementAbility({
  readOnly,
  isAdmin,
  canDedicate,
}: AchievementAuthContext): AchievementAbility {
  const { can, build } = new AbilityBuilder<AchievementAbility>(
    createMongoAbility,
  );

  can("view", "Achievement");
  can("view", "AchievementCollection");

  if (!readOnly) {
    can("create", "Achievement");
    can("edit", "Achievement");
    can("delete", "Achievement");
    can("filterVisibility", "AchievementCollection");
    can("unlockViaHold", "BadgeLock");
  }

  if (canDedicate) {
    can("dedicate", "Achievement");
  }

  if (isAdmin) {
    can("toggleLock", "BadgeLock");
    can("viewBadgeDebugMetrics", "BadgeDebugMetrics");
  }

  return build();
}
