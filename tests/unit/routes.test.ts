import { describe, expect, it } from "vitest";

import {
  authCallbackUrl,
  isAuthPath,
  loginWithNext,
  ROUTES,
  safeRedirectPath,
  userAchievementDetail,
  userCollection,
  achievementShareInvitePath,
} from "@/lib/routes";

describe("safeRedirectPath", () => {
  it("falls back to inspa for unsafe or empty next", () => {
    expect(safeRedirectPath(null)).toBe(ROUTES.inspa);
    expect(safeRedirectPath(undefined)).toBe(ROUTES.inspa);
    expect(safeRedirectPath("")).toBe(ROUTES.inspa);
    expect(safeRedirectPath("https://evil.com")).toBe(ROUTES.inspa);
    expect(safeRedirectPath("//evil.com")).toBe(ROUTES.inspa);
    expect(safeRedirectPath("/auth/login")).toBe(ROUTES.inspa);
  });

  it("allows update-password and internal absolute paths", () => {
    expect(safeRedirectPath(ROUTES.updatePassword)).toBe(ROUTES.updatePassword);
    expect(safeRedirectPath("/u/user-1")).toBe("/u/user-1");
    expect(safeRedirectPath("/invite/t?claim=1")).toBe("/invite/t?claim=1");
  });
});

describe("loginWithNext / authCallbackUrl", () => {
  it("builds encoded login with sanitised next", () => {
    expect(loginWithNext("/u/1")).toBe(
      `${ROUTES.login}?next=${encodeURIComponent("/u/1")}`,
    );
    expect(loginWithNext("https://phish")).toBe(
      `${ROUTES.login}?next=${encodeURIComponent(ROUTES.inspa)}`,
    );
  });

  it("builds callback url on absolute origin", () => {
    expect(authCallbackUrl("https://app.example")).toBe(
      "https://app.example/auth/callback",
    );
    expect(authCallbackUrl("https://app.example/", "/profile")).toBe(
      `https://app.example/auth/callback?next=${encodeURIComponent("/profile")}`,
    );
  });
});

describe("collection and invite helpers", () => {
  it("userCollection and detail query strings", () => {
    expect(userCollection("uid")).toBe("/u/uid");
    expect(userAchievementDetail("uid", "aid")).toBe(
      "/u/uid?achievement=aid",
    );
    expect(userAchievementDetail("uid", "aid", true)).toBe(
      "/u/uid?achievement=aid&dedication=1",
    );
  });

  it("share invite claim query flags", () => {
    expect(achievementShareInvitePath("tok")).toBe("/invite/tok");
    expect(achievementShareInvitePath("tok", { claim: true })).toBe(
      "/invite/tok?claim=1",
    );
    expect(
      achievementShareInvitePath("tok", { claim: true, autoAccept: true }),
    ).toBe("/invite/tok?claim=1&auto=1");
  });

  it("detects auth paths", () => {
    expect(isAuthPath("/auth/login")).toBe(true);
    expect(isAuthPath("/inspa")).toBe(false);
  });
});
