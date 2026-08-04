import { describe, expect, it } from "vitest";

import {
  LEGACY_REDIRECTS,
  RETIRED_ROUTE_SEGMENTS,
} from "@/lib/routing/legacy-redirects";
import { PROTECTED_PREFIXES, ROUTES } from "@/lib/routes";

describe("legacy redirects contract", () => {
  it("covers every retired segment and targets live destinations", () => {
    const sources = LEGACY_REDIRECTS.map((r) => r.source);
    for (const segment of RETIRED_ROUTE_SEGMENTS) {
      const hit = sources.some(
        (source) => source === segment || source.startsWith(`${segment}/`),
      );
      expect(hit, `missing redirect for ${segment}`).toBe(true);
    }

    for (const rule of LEGACY_REDIRECTS) {
      expect(rule.permanent).toBe(true);
      expect(["/inspa", "/auth/login"]).toContain(rule.destination);
      expect(rule.source).not.toBe(rule.destination);
    }
  });

  it("does not send auth shells into protected app without login", () => {
    const loginDest = LEGACY_REDIRECTS.filter((r) =>
      r.source.startsWith("/auth/"),
    );
    for (const rule of loginDest) {
      expect(rule.destination).toBe(ROUTES.login);
    }
  });

  it("retired paths are not protected prefixes (auth gate uses redirects)", () => {
    const protectedSet = new Set<string>(PROTECTED_PREFIXES);
    for (const segment of RETIRED_ROUTE_SEGMENTS) {
      expect(protectedSet.has(segment)).toBe(false);
      for (const prefix of PROTECTED_PREFIXES) {
        expect(segment.startsWith(`${prefix}/`)).toBe(false);
      }
    }
  });
});
