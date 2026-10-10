import { describe, expect, it } from "vitest";

import {
  NICKNAME_MAX_LENGTH,
  clampNickname,
  labeledValueStacks,
} from "@/lib/ui/dynamic-text";

describe("dynamic text appearance", () => {
  it("caps nicknames at the shared max length", () => {
    expect(clampNickname("Ada")).toBe("Ada");
    expect(clampNickname(` ${"a".repeat(NICKNAME_MAX_LENGTH + 4)} `).length).toBe(
      NICKNAME_MAX_LENGTH,
    );
  });

  it("stacks a scramble-wide nickname that does not fit beside the prefix", () => {
    const stacks = labeledValueStacks({
      prefix: "in collaboration w/",
      value: "a".repeat(NICKNAME_MAX_LENGTH),
      lineWidthPx: 216,
      fontSizePx: 12,
    });
    expect(stacks).toBe(true);
  });

  it("keeps a short nickname on the prefix line", () => {
    const stacks = labeledValueStacks({
      prefix: "dedicated by",
      value: "Ada",
      lineWidthPx: 216,
      fontSizePx: 12,
    });
    expect(stacks).toBe(false);
  });
});
