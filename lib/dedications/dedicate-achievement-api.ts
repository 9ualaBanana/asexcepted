import { err, ok, type Result } from "neverthrow";
import type { AchievementDbWritePayload } from "@/components/achievements/achievement-db-schema";

export type DedicateAchievementApiBody = {
  recipientUserId: string;
  title: AchievementDbWritePayload["title"];
  description: AchievementDbWritePayload["description"];
  category: AchievementDbWritePayload["category"];
  icon: string;
  icon_url: AchievementDbWritePayload["icon_url"];
  icon_file_id: AchievementDbWritePayload["icon_file_id"];
  tone: string;
  achieved_at: AchievementDbWritePayload["achieved_at"];
};

export function payloadToDedicateApiBody(
  recipientUserId: string,
  payload: AchievementDbWritePayload,
): DedicateAchievementApiBody {
  return {
    recipientUserId,
    title: payload.title,
    description: payload.description,
    category: payload.category,
    icon: payload.icon ?? "trophy",
    icon_url: payload.icon_url,
    icon_file_id: payload.icon_file_id,
    tone: payload.tone ?? "teal",
    achieved_at: payload.achieved_at,
  };
}

export async function postDedicateAchievement(
  body: DedicateAchievementApiBody,
): Promise<Result<{ achievementId: string }, string>> {
  const response = await fetch("/api/achievements/dedicate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await response.json().catch(() => null)) as {
    error?: string;
    achievementId?: string;
  } | null;

  if (!response.ok) {
    return err(data?.error ?? "Could not dedicate achievement.");
  }

  if (!data?.achievementId) {
    return err("Invalid dedication response.");
  }

  return ok({ achievementId: data.achievementId });
}
