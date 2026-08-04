import { describe, expect, it } from "vitest";

import {
  buildAchievementAbility,
  buildAchievementAuthContext,
  getAchievementPermissions,
} from "@/lib/auth/achievement-ability";

describe("achievement ability boundary", () => {
  it("owner gets edit; visitor is read-only", () => {
    const ownerAuth = buildAchievementAuthContext({
      isOwner: true,
      viewerUserId: "user-1",
    });
    expect(ownerAuth.readOnly).toBe(false);

    const owner = getAchievementPermissions(buildAchievementAbility(ownerAuth));
    expect(owner.canEditAchievements).toBe(true);
    expect(owner.canUnlockViaHold).toBe(true);

    const visitorAuth = buildAchievementAuthContext({
      isOwner: false,
      viewerUserId: "user-2",
    });
    expect(visitorAuth.readOnly).toBe(true);
    const visitor = getAchievementPermissions(
      buildAchievementAbility(visitorAuth),
    );
    expect(visitor.canEditAchievements).toBe(false);
    expect(visitor.canUnlockViaHold).toBe(false);
  });
});
