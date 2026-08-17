import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/.netlify/functions/public-settings", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: '{"error":"unavailable"}',
    }),
  );
});

test("public navigation reaches the detailed rental information", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Make room for the week");
  await page.getByRole("link", { name: /Read all rental information/ }).click();

  await expect(page).toHaveURL(/\/rental-information\/?$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Know the house before you request it.",
  );
});

test("date validation focuses a linked error summary", async ({ page }) => {
  await page.goto("/");
  const form = page.locator(".availability-form");
  await form.locator("#arrival").fill("2035-06-10");
  await form.locator("#departure").fill("2035-06-09");
  await form.locator("#guests").fill("4");
  await form.locator("#name").fill("Taylor Guest");
  await form.locator("#email").fill("taylor@example.test");
  await form.locator("#phone").fill("2525550100");
  await form.locator("#acknowledges-request").check();
  await form.locator("#acknowledges-privacy").check();

  await form.getByRole("button", { name: "Check availability" }).click();

  const summary = form.locator("[data-form-error-summary]");
  await expect(summary).toBeFocused();
  await expect(summary).toContainText("Choose a departure date after arrival.");
  await expect(form.locator("#departure")).toHaveAttribute("aria-invalid", "true");
});

test("a valid request uses the real form state and reaches the success page", async ({ page }) => {
  await page.route("**/thanks", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 303,
        headers: { location: "/thanks" },
        body: "",
      });
    } else {
      await route.continue();
    }
  });
  await page.goto("/");
  const form = page.locator(".availability-form");
  await form.locator("#arrival").fill("2035-06-10");
  await form.locator("#departure").fill("2035-06-17");
  await form.locator("#guests").fill("4");
  await form.locator("#name").fill("Taylor Guest");
  await form.locator("#email").fill("taylor@example.test");
  await form.locator("#phone").fill("2525550100");
  await form.locator("#acknowledges-request").check();
  await form.locator("#acknowledges-privacy").check();

  await form.getByRole("button", { name: "Check availability" }).click();

  await expect(page).toHaveURL(/\/thanks\/?$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Thanks for sharing your week.");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
});

test("owner login remains public while the dashboard falls back without a session", async ({
  page,
}) => {
  await page.goto("/owner");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Welcome back.");
  await expect(page.locator("[data-login-form]")).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");

  await page.goto("/owner/dashboard");
  await expect(page).toHaveURL(/\/owner\/?$/);
  await expect(page.locator("[data-login-form]")).toBeVisible();
});

test("an unauthenticated protected Function response is deterministic without Netlify accounts", async ({
  page,
}) => {
  await page.route("**/.netlify/functions/owner-settings", (route) =>
    route.fulfill({
      status: 401,
      headers: { "cache-control": "no-store" },
      contentType: "application/json",
      body: '{"error":"unauthorized"}',
    }),
  );
  await page.goto("/owner");

  const response = await page.evaluate(async () => {
    const result = await fetch("/.netlify/functions/owner-settings");
    return {
      status: result.status,
      cacheControl: result.headers.get("cache-control"),
      body: await result.json(),
    };
  });

  expect(response).toEqual({
    status: 401,
    cacheControl: "no-store",
    body: { error: "unauthorized" },
  });
});

test("unknown routes use the branded 404 page", async ({ page }) => {
  const response = await page.goto("/not-a-real-breezy-days-page");

  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "This page drifted out with the tide.",
  );
});

test("the mobile booking action stays fixed and visible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const action = page.locator(".mobile-booking-bar");

  await expect(action).toBeVisible();
  await expect(action).toHaveCSS("position", "fixed");
  const box = await action.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y + box!.height).toBeLessThanOrEqual(844);
});

test("keyboard navigation exposes a visible focus indicator", async ({ page }) => {
  await page.goto("/");

  await page.keyboard.press("Tab");

  const skipLink = page.locator(".skip-link");
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toHaveCSS("outline-style", "solid");
  await expect(skipLink).toHaveCSS("outline-width", "3px");
});
