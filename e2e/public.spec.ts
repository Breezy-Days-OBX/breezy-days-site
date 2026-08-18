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

test("hero availability carries dates and guests into the owner-reviewed request", async ({
  page,
}) => {
  await page.goto("/");
  const entry = page.locator("[data-availability-entry]");
  await entry.locator("#hero-arrival").fill("2035-06-10");
  await entry.locator("#hero-departure").fill("2035-06-17");
  await entry.locator("#hero-guests").fill("6");
  await entry.getByRole("link", { name: "Check availability" }).click();

  const request = page.locator('.availability-form[name="availability-request"]');
  await expect(request.locator("#arrival")).toHaveValue("2035-06-10");
  await expect(request.locator("#departure")).toHaveValue("2035-06-17");
  await expect(request.locator("#guests")).toHaveValue("6");
  await expect(request).toBeInViewport();
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

test("the local Function boundary invokes the protected handler for anonymous requests", async ({
  page,
}) => {
  await page.goto("/owner");

  const response = await page.evaluate(async () => {
    const result = await fetch("/.netlify/functions/owner-settings");
    return {
      status: result.status,
      cacheControl: result.headers.get("cache-control"),
      robots: result.headers.get("x-robots-tag"),
      body: await result.json(),
    };
  });

  expect(response).toEqual({
    status: 401,
    cacheControl: "no-store",
    robots: "noindex, nofollow, noarchive",
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

for (const [name, route, cardSelector] of [
  ["rental information", "/rental-information", ".policy-intro"],
  ["privacy", "/privacy", ".policy-intro"],
  ["request success", "/thanks", ".thanks-card"],
  ["not found", "/not-a-real-breezy-days-page", ".not-found-card"],
] as const) {
  test(`${name} carries the approved editorial visual system`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route);

    await expect(page.locator("body")).toHaveClass(/supporting-page/);
    await expect(page.locator(".site-header")).toBeVisible();
    await expect(page.locator("body")).toHaveCSS("font-family", /DM Sans/);

    const card = page.locator(cardSelector);
    await expect(card).toBeVisible();
    const radius = await card.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).borderTopLeftRadius),
    );
    expect(radius).toBeGreaterThanOrEqual(20);

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
}

test("private owner access carries the refined system without public navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/owner");

  await expect(page.locator("body")).toHaveClass(/owner-page/);
  await expect(page.locator(".main-nav")).toHaveCount(0);
  await expect(page.locator("body")).toHaveCSS("font-family", /DM Sans/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCSS(
    "font-family",
    /Playfair Display/,
  );

  const card = page.locator(".owner-access-card");
  const radius = await card.evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).borderTopLeftRadius),
  );
  expect(radius).toBeGreaterThanOrEqual(20);
});

test("rental details avoid orphaned half-width rows on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/rental-information");

  const grid = await page.locator(".policy-section-grid").boundingBox();
  const water = await page.locator('[aria-labelledby="rental-water"]').boundingBox();
  const safety = await page.locator('[aria-labelledby="rental-safety"]').boundingBox();

  expect(grid).not.toBeNull();
  expect(water).not.toBeNull();
  expect(safety).not.toBeNull();
  expect(water!.width).toBeGreaterThan(grid!.width * 0.9);
  expect(safety!.width).toBeGreaterThan(grid!.width * 0.9);
});

test("desktop hero keeps the approved editorial type and generous booking panel", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1536, height: 1000 });
  await page.goto("/");

  await expect(page.locator(".main-nav")).toHaveCSS("font-family", /DM Sans/);
  await expect(page.locator(".hero h1")).toHaveCSS("font-family", /Playfair Display/);

  const headingWeight = Number.parseInt(
    await page.locator(".hero h1").evaluate((element) => getComputedStyle(element).fontWeight),
    10,
  );
  expect(headingWeight).toBeLessThanOrEqual(450);

  const panel = page.locator("[data-availability-entry]");
  const panelBox = await panel.boundingBox();
  const actionBox = await panel.getByRole("link", { name: "Check availability" }).boundingBox();
  expect(panelBox).not.toBeNull();
  expect(actionBox).not.toBeNull();
  expect(panelBox!.height).toBeGreaterThanOrEqual(126);
  expect(actionBox!.height).toBeGreaterThanOrEqual(68);
  await expect(panel.locator("#hero-arrival")).toHaveCSS("border-top-width", "0px");
});

test("hero availability gives every field a recognizable visual affordance", async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 1000 });
  await page.goto("/");

  const entry = page.locator("[data-availability-entry]");
  await expect(entry.locator(".hero-field-icon")).toHaveCount(1);
});

test("the rounded hero entry stays visible within the mobile hero", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const entry = page.locator("[data-availability-entry]");

  await expect(entry).toBeVisible();
  await expect(entry).toBeInViewport();
  await expect(page.locator(".mobile-booking-bar")).toHaveCount(0);
  const box = await entry.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y).toBeLessThan(844);
});

test("keyboard navigation exposes a visible focus indicator", async ({ page }) => {
  await page.goto("/");

  await page.keyboard.press("Tab");

  const skipLink = page.locator(".skip-link");
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toHaveCSS("outline-style", "solid");
  await expect(skipLink).toHaveCSS("outline-width", "3px");
});
