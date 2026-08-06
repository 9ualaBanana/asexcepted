import type { Result } from "neverthrow";

import type {
  Achievement,
  AchievementWrite,
} from "@/lib/achievements/domain/achievement";
import type { FollowingUnlockFeedEvent } from "@/lib/achievements/domain/feed-event";
import { CreateImpressionResult } from "@/lib/achievements/domain/impression";

export type FeedCursor = {
  updated_at: string;
  id: string;
};

export type FeedEventPage = {
  events: FollowingUnlockFeedEvent[];
  nextCursor: FeedCursor | null;
};

export type AchievementPort = {
  list(userId: string): Promise<Result<Achievement[], string>>;
  create(write: AchievementWrite): Promise<Result<Achievement, string>>;
  update(
    id: string,
    write: AchievementWrite,
  ): Promise<Result<Achievement, string>>;
  delete(id: string): Promise<Result<void, string>>;
  unlock(id: string): Promise<Result<Achievement, string>>;
};

export type DedicationPort = {
  listPending(recipientUserId: string): Promise<Result<Achievement[], string>>;
  accept(
    achievementId: string,
    recipientUserId: string,
  ): Promise<Result<Achievement, string>>;
  reject(achievementId: string): Promise<Result<void, string>>;
};

export type FeedPort = {
  fetchFollowingUnlock(options?: {
    limit?: number;
    cursor?: FeedCursor | null;
  }): Promise<Result<FeedEventPage, string>>;
};

export type EmbedPort = {
  getBadgeSource(achievementId: string): Promise<
    Result<
      {
        icon_url: string | null;
        icon_asset_kind?: string | null;
        icon_asset_path?: string | null;
        icon_model_yaw?: number | null;
        icon_model_pitch?: number | null;
        icon_model_animation_play?: boolean | null;
        icon_model_animation_speed?: number | null;
        icon_cc_attribution?: string | null;
      },
      string
    >
  >;
  getMintSource(
    achievementId: string,
    ownerUserId: string,
  ): Promise<Result<{ id: string; icon_url: string | null }, string>>;
};

export type ImpressionPort = {
  create(achievementId: string): Promise<Result<CreateImpressionResult, string>>;
  fetchCountMap(achievementIds: string[]): Promise<Result<Record<string, number>, string>>;
};
