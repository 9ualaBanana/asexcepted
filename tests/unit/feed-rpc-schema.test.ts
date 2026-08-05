import { describe, expect, it } from "vitest";

import {
  feedRpcRowToViewModel,
  followingUnlockFeedRowSchema,
  followingUnlockFeedRowsSchema,
} from "@/lib/achievements/data/achievement-surface-view-models";

const baseRow = {
  event_type: "unlock" as const,
  event_id: "11111111-1111-4111-8111-111111111111",
  achievement_id: "22222222-2222-4222-8222-222222222222",
  user_id: "33333333-3333-4333-8333-333333333333",
  actor_user_id: "33333333-3333-4333-8333-333333333333",
  actor_display_name: "Ada",
  actor_avatar_url: null,
  title: "First",
  description: null,
  category: null,
  icon: "trophy" as const,
  icon_url: "https://ik.imagekit.io/x/badge.png",
  icon_file_id: null,
  icon_asset_kind: "image" as const,
  tone: "teal" as const,
  achieved_at: "2026-05-01",
  created_at: "2026-05-01T10:00:00.000Z",
  updated_at: "2026-05-01T10:00:00.000Z",
  event_at: "2026-05-01T12:00:00.000Z",
  is_dedicated: false,
};

describe("followingUnlockFeedRowSchema", () => {
  it("accepts a complete RPC row", () => {
    const parsed = followingUnlockFeedRowSchema.safeParse(baseRow);
    expect(parsed.success).toBe(true);
  });

  it("rejects missing event_type", () => {
    const { event_type: _removed, ...rest } = baseRow;
    const parsed = followingUnlockFeedRowSchema.safeParse(rest);
    expect(parsed.success).toBe(false);
  });

  it("rejects unknown event_type", () => {
    const parsed = followingUnlockFeedRowSchema.safeParse({
      ...baseRow,
      event_type: "like",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects non-uuid event_id", () => {
    const parsed = followingUnlockFeedRowSchema.safeParse({
      ...baseRow,
      event_id: "not-a-uuid",
    });
    expect(parsed.success).toBe(false);
  });

  it("parses empty page", () => {
    const parsed = followingUnlockFeedRowsSchema.safeParse([]);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data).toEqual([]);
  });

  it("rejects non-array payload", () => {
    const parsed = followingUnlockFeedRowsSchema.safeParse(null);
    expect(parsed.success).toBe(false);
  });
});

describe("feedRpcRowToViewModel", () => {
  it("maps dedicated model badges without glitter", () => {
    const row = followingUnlockFeedRowSchema.parse({
      ...baseRow,
      event_type: "dedication",
      is_dedicated: true,
      icon_asset_kind: "model_glb",
    });
    const vm = feedRpcRowToViewModel(row);
    expect(vm.eventType).toBe("dedication");
    expect(vm.isDedicated).toBe(true);
    expect(vm.showDedicatedEffect).toBe(false);
  });

  it("maps dedicated image badges with glitter", () => {
    const row = followingUnlockFeedRowSchema.parse({
      ...baseRow,
      is_dedicated: true,
      icon_asset_kind: "image",
    });
    const vm = feedRpcRowToViewModel(row);
    expect(vm.showDedicatedEffect).toBe(true);
  });
});
