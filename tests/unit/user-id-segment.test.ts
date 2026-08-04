import { describe, expect, it } from "vitest";

import { isAuthUserIdSegment } from "@/lib/user-achievements-page";

describe("isAuthUserIdSegment", () => {
  it("accepts supabase-style uuids", () => {
    expect(isAuthUserIdSegment("550e8400-e29b-41d4-a716-446655440000")).toBe(
      true,
    );
  });

  it("rejects garbage path segments", () => {
    expect(isAuthUserIdSegment("not-a-uuid")).toBe(false);
    expect(isAuthUserIdSegment("")).toBe(false);
    expect(isAuthUserIdSegment("../etc")).toBe(false);
  });
});
