import { describe, expect, it } from "vitest";

import {
  buildNotificationContent,
  links,
  notificationLinks,
} from "@/lib/notifications/templates";
import { ROUTES, userAchievementDetail } from "@/lib/routes";

describe("notification deep links", () => {
  it("points feed-class events at live inspa route (not retired /social)", () => {
    const map = notificationLinks();
    expect(map.feed).toBe(ROUTES.inspa);
    expect(map.profile).toBe(ROUTES.profile);
    expect("social" in map).toBe(false);
    expect(links.feed).toBe(ROUTES.inspa);
  });

  it("new_follower opens feed home", () => {
    const content = buildNotificationContent("new_follower", {
      followerName: "Ada",
    });
    expect(content.url).toBe(ROUTES.inspa);
    expect(content.type).toBe("new_follower");
  });

  it("unlock opens achievement detail deep link", () => {
    const content = buildNotificationContent("unlock", {
      actorName: "Ada",
      achievementTitle: "First",
      ownerUserId: "owner-1",
      achievementId: "ach-1",
    });
    expect(content.url).toBe(userAchievementDetail("owner-1", "ach-1"));
  });
});
