import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  ACHIEVEMENT_ICON_KEYS,
  ACHIEVEMENT_TONES,
  DEFAULT_ACHIEVEMENT_ICON_KEY,
  DEFAULT_ACHIEVEMENT_TONE,
  DEFAULT_ACHIEVEMENT_VISIBILITY,
  DEFAULT_ICON_ASSET_KIND,
  achievementIconKeySchema,
  achievementToneSchema,
  achievementVisibilitySchema,
  iconAssetKindSchema,
} from "@/lib/achievements/domain/enums";
import {
  normalizeAchievementRowsForList,
  tryNormalizeAchievement,
  type AchievementDomainRow,
} from "@/lib/achievements/domain/achievement";
import {
  detailToGridViewModel,
  domainRowToDetailViewModel,
} from "@/lib/achievements/presentation/collection-view-models";

const DEDICATED_BY = "44444444-4444-4444-8444-444444444444";

function baseRow(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    title: "T",
    description: null,
    category: null,
    icon: DEFAULT_ACHIEVEMENT_ICON_KEY,
    icon_url: null,
    icon_file_id: null,
    icon_asset_kind: DEFAULT_ICON_ASSET_KIND,
    icon_asset_path: null,
    icon_cc_attribution: null,
    icon_model_yaw: 0,
    icon_model_pitch: 0,
    icon_model_animation_play: true,
    icon_model_animation_speed: 1,
    tone: DEFAULT_ACHIEVEMENT_TONE,
    is_locked: false,
    achieved_at: null,
    created_at: "2024-01-01T00:00:00.000Z",
    visibility: DEFAULT_ACHIEVEMENT_VISIBILITY,
    dedicated_by_user_id: null,
    dedication_status: null,
    ...over,
  };
}

describe("enum schemas are closed unions", () => {
  it("accepts every ACHIEVEMENT_TONES / ICON / VIS / KIND member", () => {
    for (const tone of ACHIEVEMENT_TONES) {
      expect(achievementToneSchema.parse(tone)).toBe(tone);
    }
    for (const key of ACHIEVEMENT_ICON_KEYS) {
      expect(achievementIconKeySchema.parse(key)).toBe(key);
    }
    expect(achievementVisibilitySchema.parse("private")).toBe("private");
    expect(iconAssetKindSchema.parse("model_glb")).toBe("model_glb");
  });

  it("rejects garbage enums", () => {
    expect(achievementToneSchema.safeParse("not-a-tone").success).toBe(false);
    expect(achievementIconKeySchema.safeParse("missing").success).toBe(false);
    expect(achievementVisibilitySchema.safeParse("secret").success).toBe(false);
    expect(iconAssetKindSchema.safeParse("mesh").success).toBe(false);
  });
});

describe("tryNormalizeAchievement hard domain", () => {
  it("maps a minimal public image row", () => {
    const normalized = tryNormalizeAchievement(baseRow());
    expect(normalized.isOk()).toBe(true);
    if (normalized.isOk()) {
      expect(normalized.value).toEqual({
        id: "11111111-1111-4111-8111-111111111111",
        title: "T",
        description: null,
        category: null,
        icon: DEFAULT_ACHIEVEMENT_ICON_KEY,
        icon_url: null,
        icon_file_id: null,
        icon_asset_kind: DEFAULT_ICON_ASSET_KIND,
        icon_asset_path: null,
        icon_cc_attribution: null,
        icon_model_yaw: 0,
        icon_model_pitch: 0,
        icon_model_animation_play: true,
        icon_model_animation_speed: 1,
        tone: DEFAULT_ACHIEVEMENT_TONE,
        is_locked: false,
        achieved_at: null,
        created_at: "2024-01-01T00:00:00.000Z",
        visibility: DEFAULT_ACHIEVEMENT_VISIBILITY,
        impression_count: 0,
        dedicated_by_user_id: null,
        dedication_status: null,
      } satisfies AchievementDomainRow);
    }
  });

  it("rejects garbage enums and empty id", () => {
    expect(tryNormalizeAchievement(baseRow({ icon: "nope" })).isErr()).toBe(true);
    expect(tryNormalizeAchievement(baseRow({ tone: "HOTPINK" })).isErr()).toBe(true);
    expect(tryNormalizeAchievement(baseRow({ visibility: "secret" })).isErr()).toBe(
      true,
    );
    expect(
      tryNormalizeAchievement(baseRow({ icon_asset_kind: "mesh" })).isErr(),
    ).toBe(true);
    expect(tryNormalizeAchievement(baseRow({ id: "" })).isErr()).toBe(true);
    expect(tryNormalizeAchievement(baseRow({ id: "not-uuid" })).isErr()).toBe(true);
    expect(tryNormalizeAchievement(baseRow({ tone: null })).isErr()).toBe(true);
  });

  it("accepts valid closed enums including model_glb + private + rose", () => {
    const normalized = tryNormalizeAchievement(
      baseRow({
        icon: "spiral",
        tone: "rose",
        visibility: "private",
        icon_asset_kind: "model_glb",
        icon_asset_path: " path/model.glb ",
      }),
    );
    expect(normalized.isOk()).toBe(true);
    if (normalized.isOk()) {
      expect(normalized.value.icon).toBe("spiral");
      expect(normalized.value.tone).toBe("rose");
      expect(normalized.value.visibility).toBe("private");
      expect(normalized.value.icon_asset_kind).toBe("model_glb");
      expect(normalized.value.icon_asset_path).toBe("path/model.glb");
    }
  });

  it("dedication_status pending / accepted / legacy dedicated_by rules", () => {
    const pending = tryNormalizeAchievement(
      baseRow({
        dedication_status: "pending",
        dedicated_by_user_id: DEDICATED_BY,
      }),
    );
    expect(pending.isOk() && pending.value.dedication_status).toBe("pending");

    const accepted = tryNormalizeAchievement(
      baseRow({
        dedication_status: "accepted",
        dedicated_by_user_id: DEDICATED_BY,
      }),
    );
    expect(accepted.isOk() && accepted.value.dedication_status).toBe("accepted");

    const legacy = tryNormalizeAchievement(
      baseRow({ dedicated_by_user_id: DEDICATED_BY }),
    );
    expect(legacy.isOk() && legacy.value.dedication_status).toBe("accepted");
  });
});

describe("normalizeAchievementRowsForList", () => {
  it("keeps valid rows and drops invalid ones", () => {
    const rows = normalizeAchievementRowsForList(
      [
        baseRow(),
        baseRow({ id: "bad", icon: "nope" }),
        baseRow({
          id: "22222222-2222-4222-8222-222222222222",
          icon: "flame",
        }),
      ],
      "test-list",
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]?.icon).toBe(DEFAULT_ACHIEVEMENT_ICON_KEY);
    expect(rows[1]?.icon).toBe("flame");
  });
});

describe("domain → detail/grid trusts enums", () => {
  it("passes tone/icon/visibility without re-defaulting valid values", () => {
    const normalized = tryNormalizeAchievement(
      baseRow({
        icon: "flame",
        tone: "orange",
        visibility: "private",
        is_locked: true,
      }),
    );
    expect(normalized.isOk()).toBe(true);
    if (!normalized.isOk()) return;
    const detail = domainRowToDetailViewModel(normalized.value);
    expect(detail.icon).toBe("flame");
    expect(detail.tone).toBe("orange");
    expect(detail.visibility).toBe("private");
    expect(detail.isLocked).toBe(true);
    const grid = detailToGridViewModel(detail);
    expect(grid.icon).toBe("flame");
    expect(grid.tone).toBe("orange");
  });
});

describe("achievements import boundary", () => {
  it("domain and persistence must not import from components", () => {
    const roots = [
      path.resolve("lib/achievements/domain"),
      path.resolve("lib/achievements/persistence"),
      path.resolve("lib/achievements/application"),
    ];
    const forbidden = ['from "@/components/', "from '@/components/"];
    for (const dir of roots) {
      const files = readdirSync(dir).filter((f) => f.endsWith(".ts"));
      for (const file of files) {
        const text = readFileSync(path.join(dir, file), "utf8");
        for (const needle of forbidden) {
          expect(text.includes(needle), `${dir}/${file} imports components`).toBe(
            false,
          );
        }
      }
    }
    expect(
      readFileSync(path.resolve("lib/achievements/domain/enums.ts"), "utf8"),
    ).toMatch(/DEFAULT_ACHIEVEMENT_TONE/);
    expect(
      readFileSync(path.resolve("lib/achievements/domain/enums.ts"), "utf8"),
    ).not.toMatch(/export function parseTone/);
  });
});
