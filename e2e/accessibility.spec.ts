import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const publicPages = [
  ["home", "/"],
  ["rental information", "/rental-information"],
  ["privacy", "/privacy"],
  ["request success", "/thanks"],
  ["not found", "/not-a-real-breezy-days-page"],
] as const;

for (const [name, path] of publicPages) {
  test(`@axe ${name} has no critical or serious accessibility violations`, async ({ page }) => {
    await page.route("**/.netlify/functions/public-settings", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: '{"error":"unavailable"}',
      }),
    );
    await page.goto(path);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    const severe = results.violations.filter(
      ({ impact }) => impact === "critical" || impact === "serious",
    );

    expect(severe, JSON.stringify(severe, null, 2)).toEqual([]);
  });

  test(`@axe ${name} meets the forced WCAG 2.2 target-size rule`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route("**/.netlify/functions/public-settings", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: '{"error":"unavailable"}',
      }),
    );
    await page.goto(path);

    const results = await new AxeBuilder({ page })
      .options({ rules: { "target-size": { enabled: true } } })
      .withRules(["target-size"])
      .analyze();

    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
}
