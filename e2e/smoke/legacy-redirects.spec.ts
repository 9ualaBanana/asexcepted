import { test, expect } from "@playwright/test";

/**
 * HTTP smoke against a running app (dev or preview).
 * Does not require auth — covers permanent redirects + public shells.
 *
 *   pnpm dev   # terminal 1
 *   pnpm test:e2e
 *
 * Or E2E_BASE_URL=https://staging.example.com pnpm test:e2e
 */
const cases: { path: string; expectedContains: string }[] = [
  { path: "/achievements", expectedContains: "/inspa" },
  { path: "/friends", expectedContains: "/inspa" },
  { path: "/social", expectedContains: "/inspa" },
  { path: "/auth/sign-up", expectedContains: "/auth/login" },
  { path: "/auth/sign-up-success", expectedContains: "/auth/login" },
];

for (const { path, expectedContains } of cases) {
  test(`legacy ${path} redirects to ${expectedContains}`, async ({
    request,
  }) => {
    const res = await request.get(path, { maxRedirects: 0 });
    expect([301, 302, 307, 308]).toContain(res.status());
    const location = res.headers()["location"] ?? "";
    expect(location).toContain(expectedContains);
  });
}

test("login is reachable", async ({ request }) => {
  const res = await request.get("/auth/login");
  expect(res.status()).toBeLessThan(500);
});

test("home responds", async ({ request }) => {
  const res = await request.get("/");
  expect(res.status()).toBeLessThan(500);
});
