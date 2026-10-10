import { err, ok, type Result } from "neverthrow";

import type { EmbedPort } from "@/lib/achievements/application/ports";
import {
  embedBadgeRowToViewModel,
  embedMintRowToViewModel,
  type AchievementEmbedBadgeViewModel,
  type AchievementEmbedMintViewModel,
} from "@/lib/achievements/presentation/surface-view-models";

export async function loadEmbedBadge(
  achievementId: string,
  port: EmbedPort,
): Promise<Result<AchievementEmbedBadgeViewModel, string>> {
  const source = await port.getBadgeSource(achievementId);
  if (source.isErr()) return err(source.error);
  const badge = embedBadgeRowToViewModel(source.value);
  if (!badge) return err("Achievement not found");
  return ok(badge);
}

export async function loadEmbedMint(
  achievementId: string,
  ownerUserId: string,
  port: EmbedPort,
): Promise<Result<AchievementEmbedMintViewModel, string>> {
  const source = await port.getMintSource(achievementId, ownerUserId);
  if (source.isErr()) return err(source.error);
  const mint = embedMintRowToViewModel(source.value.id, source.value);
  if (!mint) return err("Achievement not found");
  return ok(mint);
}
