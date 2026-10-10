import { z } from "zod";

import {
  achievementIconKeySchema,
  achievementToneSchema,
  iconAssetKindSchema,
} from "@/lib/achievements/domain/enums";

export const FEED_EVENT_TYPES = ["unlock", "impression", "dedication"] as const;
export type FeedEventType = (typeof FEED_EVENT_TYPES)[number];

const uuidSchema = z.uuid();
const isoTimestampSchema = z.string().min(1);
const nullableTextSchema = z.string().nullable();

/** Validated following-unlock feed event (RPC payload after parse). */
export const followingUnlockFeedEventSchema = z.object({
  event_type: z.enum(FEED_EVENT_TYPES),
  event_id: uuidSchema,
  achievement_id: uuidSchema,
  user_id: uuidSchema,
  actor_user_id: uuidSchema,
  actor_display_name: z.string(),
  actor_avatar_url: nullableTextSchema,
  title: nullableTextSchema,
  description: nullableTextSchema,
  category: nullableTextSchema,
  icon: achievementIconKeySchema,
  icon_url: nullableTextSchema,
  icon_file_id: nullableTextSchema,
  icon_asset_kind: iconAssetKindSchema,
  tone: achievementToneSchema,
  achieved_at: nullableTextSchema,
  created_at: isoTimestampSchema,
  updated_at: isoTimestampSchema,
  event_at: isoTimestampSchema,
  is_dedicated: z.boolean(),
});

export type FollowingUnlockFeedEvent = z.infer<
  typeof followingUnlockFeedEventSchema
>;

export const followingUnlockFeedEventsSchema = z.array(
  followingUnlockFeedEventSchema,
);

/** @deprecated Use {@link followingUnlockFeedEventSchema}. */
export const followingUnlockFeedRowSchema = followingUnlockFeedEventSchema;
/** @deprecated Use {@link FollowingUnlockFeedEvent}. */
export type FollowingUnlockFeedRow = FollowingUnlockFeedEvent;
/** @deprecated Use {@link followingUnlockFeedEventsSchema}. */
export const followingUnlockFeedRowsSchema = followingUnlockFeedEventsSchema;
