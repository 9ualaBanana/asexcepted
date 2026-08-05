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
  parseIconAssetKind,
  parseIconKey,
  parseTone,
  parseVisibility,
} from "@/lib/achievements/data/achievement-enums";
import {
  coerceAchievementDbRow,
  type AchievementDomainRow,
} from "@/lib/achievements/data/achievement-transformers";
import {
  detailToGridViewModel,
  domainRowToDetailViewModel,
} from "@/lib/achievements/data/achievement-view-models";

describe("parseTone", () => {
  it.each([
    ["rose", "rose"],
    ["teal", "teal"],
    ["fuchsia", "fuchsia"],
    [null, DEFAULT_ACHIEVEMENT_TONE],
    [undefined, DEFAULT_ACHIEVEMENT_TONE],
    ["", DEFAULT_ACHIEVEMENT_TONE],
    ["Teal", DEFAULT_ACHIEVEMENT_TONE],
    ["not-a-tone", DEFAULT_ACHIEVEMENT_TONE],
  ] as const)("parseTone(%j) → %j", (input, expected) => {
    expect(parseTone(input)).toBe(expected);
  });

  it("accepts every ACHIEVEMENT_TONES member", () => {
    for (const tone of ACHIEVEMENT_TONES) {
      expect(parseTone(tone)).toBe(tone);
    }
  });
});

describe("parseIconKey", () => {
  it.each([
    ["trophy", "trophy"],
    ["spiral", "spiral"],
    ["medal", "medal"],
    [null, DEFAULT_ACHIEVEMENT_ICON_KEY],
    [undefined, DEFAULT_ACHIEVEMENT_ICON_KEY],
    ["", DEFAULT_ACHIEVEMENT_ICON_KEY],
    ["missing", DEFAULT_ACHIEVEMENT_ICON_KEY],
    ["Trophy", DEFAULT_ACHIEVEMENT_ICON_KEY],
  ] as const)("parseIconKey(%j) → %j", (input, expected) => {
    expect(parseIconKey(input)).toBe(expected);
  });

  it("accepts every ACHIEVEMENT_ICON_KEYS member", () => {
    for (const key of ACHIEVEMENT_ICON_KEYS) {
      expect(parseIconKey(key)).toBe(key);
    }
  });
});

describe("parseVisibility / parseIconAssetKind", () => {
  it.each([
    ["private", "private"],
    ["public", "public"],
    [null, DEFAULT_ACHIEVEMENT_VISIBILITY],
    ["", DEFAULT_ACHIEVEMENT_VISIBILITY],
    ["PUBLIC", DEFAULT_ACHIEVEMENT_VISIBILITY],
  ] as const)("parseVisibility(%j) → %j", (input, expected) => {
    expect(parseVisibility(input)).toBe(expected);
  });

  it.each([
    ["model_glb", "model_glb"],
    ["image", "image"],
    [null, DEFAULT_ICON_ASSET_KIND],
    ["", DEFAULT_ICON_ASSET_KIND],
    ["glb", DEFAULT_ICON_ASSET_KIND],
  ] as const)("parseIconAssetKind(%j) → %j", (input, expected) => {
    expect(parseIconAssetKind(input)).toBe(expected);
  });
});

function baseRow(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "ach-1",
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

describe("coerceAchievementDbRow goldens", () => {
  it("maps a minimal public image row", () => {
    expect(coerceAchievementDbRow(baseRow())).toEqual({
      id: "ach-1",
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
  });

  it("coerces garbage enums to defaults and locks private model", () => {
    const row = coerceAchievementDbRow(
      baseRow({
        icon: "nope",
        tone: "HOTPINK",
        visibility: "secret",
        icon_asset_kind: "mesh",
        is_locked: true,
        icon_asset_path: " user/a.glb ",
      }),
    );
    expect(row.icon).toBe(DEFAULT_ACHIEVEMENT_ICON_KEY);
    expect(row.tone).toBe(DEFAULT_ACHIEVEMENT_TONE);
    expect(row.visibility).toBe(DEFAULT_ACHIEVEMENT_VISIBILITY);
    expect(row.icon_asset_kind).toBe(DEFAULT_ICON_ASSET_KIND);
    expect(row.is_locked).toBe(true);
    expect(row.icon_asset_path).toBe("user/a.glb");
  });

  it("accepts valid closed enums including model_glb + private + rose", () => {
    const row = coerceAchievementDbRow(
      baseRow({
        icon: "spiral",
        tone: "rose",
        visibility: "private",
        icon_asset_kind: "model_glb",
        icon_asset_path: "path/model.glb",
      }),
    );
    expect(row.icon).toBe("spiral");
    expect(row.tone).toBe("rose");
    expect(row.visibility).toBe("private");
    expect(row.icon_asset_kind).toBe("model_glb");
  });

  it("dedication_status pending / accepted rules", () => {
    expect(
      coerceAchievementDbRow(
        baseRow({ dedication_status: "pending", dedicated_by_user_id: "u2" }),
      ).dedication_status,
    ).toBe("pending");
    expect(
      coerceAchievementDbRow(
        baseRow({ dedication_status: "accepted", dedicated_by_user_id: "u2" }),
      ).dedication_status,
    ).toBe("accepted");
    expect(
      coerceAchievementDbRow(baseRow({ dedicated_by_user_id: "u2" })).dedication_status,
    ).toBe("accepted");
  });
});

describe("domain → detail/grid trusts enums", () => {
  it("passes tone/icon/visibility without re-defaulting valid values", () => {
    const domain = coerceAchievementDbRow(
      baseRow({
        icon: "flame",
        tone: "orange",
        visibility: "private",
        is_locked: true,
      }),
    );
    const detail = domainRowToDetailViewModel(domain);
    expect(detail.icon).toBe("flame");
    expect(detail.tone).toBe("orange");
    expect(detail.visibility).toBe("private");
    expect(detail.isLocked).toBe(true);
    const grid = detailToGridViewModel(detail);
    expect(grid.icon).toBe("flame");
    expect(grid.tone).toBe("orange");
  });
});

describe("data layer import boundary", () => {
  it("does not import from components achievement UI modules", () => {
    const dataDir = path.resolve("lib/achievements/data");
    const files = readdirSync(dataDir).filter((f) => f.endsWith(".ts"));
    const forbidden = [
      "from \"@/components/",
      "from '@/components/",
    ];
    for (const file of files) {
      const text = readFileSync(path.join(dataDir, file), "utf8");
      for (const needle of forbidden) {
        expect(text.includes(needle), `${file} imports components`).toBe(false);
      }
    }
    expect(
      readFileSync(path.join(dataDir, "achievement-enums.ts"), "utf8"),
    ).toMatch(/DEFAULT_ACHIEVEMENT_TONE/);
  });
});
