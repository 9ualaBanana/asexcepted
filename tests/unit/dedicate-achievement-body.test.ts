import { describe, expect, it } from "vitest";

import { parseDedicateAchievementBody } from "@/lib/achievements/data/dedicate-achievement-body";

const baseBody = {
  recipientUserId: "33333333-3333-4333-8333-333333333333",
  title: "Gift",
  description: null,
  category: null,
  icon: "flame",
  icon_url: "https://ik.imagekit.io/x/badge.png",
  icon_file_id: null,
  icon_asset_kind: "image",
  icon_asset_path: null,
  icon_cc_attribution: null,
  icon_model_yaw: 0,
  icon_model_pitch: 0,
  icon_model_animation_play: true,
  icon_model_animation_speed: 1,
  tone: "orange",
  achieved_at: null,
};

describe("parseDedicateAchievementBody", () => {
  it("accepts a full body and applies enum fields strictly", () => {
    const parsed = parseDedicateAchievementBody(baseBody);
    expect(parsed.isOk()).toBe(true);
    if (parsed.isOk()) {
      expect(parsed.value.icon).toBe("flame");
      expect(parsed.value.tone).toBe("orange");
      expect(parsed.value.icon_asset_kind).toBe("image");
    }
  });

  it("fills defaults for omitted optional enums", () => {
    const parsed = parseDedicateAchievementBody({
      recipientUserId: baseBody.recipientUserId,
      icon_url: baseBody.icon_url,
    });
    expect(parsed.isOk()).toBe(true);
    if (parsed.isOk()) {
      expect(parsed.value.icon).toBe("trophy");
      expect(parsed.value.tone).toBe("teal");
      expect(parsed.value.icon_asset_kind).toBe("image");
      expect(parsed.value.icon_model_animation_speed).toBe(1);
    }
  });

  it("rejects invalid icon without soft-coercing", () => {
    const parsed = parseDedicateAchievementBody({
      ...baseBody,
      icon: "not-an-icon",
    });
    expect(parsed.isErr()).toBe(true);
    if (parsed.isErr()) {
      expect(parsed.error.status).toBe(400);
    }
  });

  it("rejects invalid tone", () => {
    const parsed = parseDedicateAchievementBody({
      ...baseBody,
      tone: "neon",
    });
    expect(parsed.isErr()).toBe(true);
  });

  it("rejects out-of-range animation speed", () => {
    const parsed = parseDedicateAchievementBody({
      ...baseBody,
      icon_model_animation_speed: 9,
    });
    expect(parsed.isErr()).toBe(true);
  });
});
