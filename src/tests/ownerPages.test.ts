import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";

import SiteFooter from "../components/SiteFooter.astro";
import SiteHeader from "../components/SiteHeader.astro";
import { siteContent } from "../content/site";
import { ownerSettingDefinitions } from "../lib/ownerSettings";

const pages = import.meta.glob("../pages/owner/*.astro", { eager: true });

describe("static owner routes", () => {
  it.each([
    ["login", "../pages/owner/index.astro"],
    ["dashboard", "../pages/owner/dashboard.astro"],
  ])("renders the %s route as noindex and without analytics or signup", async (_name, pagePath) => {
    const page = pages[pagePath] as
      { default: Parameters<AstroContainer["renderToString"]>[0] } | undefined;
    expect(page).toBeDefined();
    if (!page) return;
    const container = await AstroContainer.create();
    const html = await container.renderToString(page.default, {
      partial: false,
    });

    expect(html).toContain('<meta name="robots" content="noindex, nofollow">');
    expect(html).toContain('data-analytics-enabled="false"');
    expect(html).not.toMatch(/googletagmanager|clarity\.ms|data-analytics-event/i);
    expect(html).not.toMatch(/sign[ -]?up|create (?:an )?account/i);
  });

  it("renders the eight live values as three owner-facing publishing sections", async () => {
    const page = pages["../pages/owner/dashboard.astro"] as
      { default: Parameters<AstroContainer["renderToString"]>[0] } | undefined;
    if (!page) return;
    const container = await AstroContainer.create();
    const html = await container.renderToString(page.default, {
      partial: false,
    });

    for (const key of Object.keys(ownerSettingDefinitions)) {
      expect(html).toContain(`name="${key}"`);
    }
    expect(html.match(/data-owner-section=/g) ?? []).toHaveLength(3);
    expect(html).toContain('data-owner-section="pricing"');
    expect(html).toContain('data-owner-section="pool"');
    expect(html).toContain('data-owner-section="pets"');
    expect(html).toContain('data-owner-preview="pricing"');
    expect(html).toContain('data-owner-preview="pool"');
    expect(html).toContain('data-owner-preview="pets"');
    expect(html).not.toMatch(/>Allowed<|>Public location<|>Fallback</);
  });

  it("renders purpose-built money, stay, date, pet, preview, and history controls", async () => {
    const page = pages["../pages/owner/dashboard.astro"] as
      { default: Parameters<AstroContainer["renderToString"]>[0] } | undefined;
    if (!page) return;
    const container = await AstroContainer.create();
    const html = await container.renderToString(page.default, { partial: false });

    expect(html.match(/data-currency-field/g) ?? []).toHaveLength(3);
    expect(html).toMatch(/<select[^>]*name="minimumStayNights"/);
    expect(html).toMatch(/<option[^>]*value=""[^>]*>Varies by dates</);
    expect(html).toMatch(/<input[^>]*name="poolOpenMonthDay"[^>]*type="date"/);
    expect(html).toMatch(/<input[^>]*name="poolCloseMonthDay"[^>]*type="date"/);
    expect(html).toContain('value="2024-04-15"');
    expect(html).toContain('value="2024-10-15"');
    expect(html).toMatch(/<select[^>]*name="maxPets"/);
    expect(html).toContain("No pets allowed");
    expect(html).toContain('href="/#process"');
    expect(html).toContain('href="/#essentials"');
    expect(html).toContain('href="/rental-information#rental-water"');
    expect(html).toContain('href="/rental-information#rental-rules"');
    expect(html).toContain("Publish changes");
    expect(html).toContain("data-owner-history");
  });

  it("renders a stable no-access state with logout for authenticated non-owners", async () => {
    const page = pages["../pages/owner/index.astro"] as
      { default: Parameters<AstroContainer["renderToString"]>[0] } | undefined;
    if (!page) return;
    const container = await AstroContainer.create();
    const html = await container.renderToString(page.default, { partial: false });

    expect(html).toContain("data-owner-no-access");
    expect(html).toMatch(/does not have owner access/i);
    expect(html).toContain("data-no-access-logout");
    expect(html).toMatch(/data-no-access-logout[^>]*>Log out</);
  });

  it("keeps the shared numeric limits behind the purpose-built controls", async () => {
    const page = pages["../pages/owner/dashboard.astro"] as
      { default: Parameters<AstroContainer["renderToString"]>[0] } | undefined;
    if (!page) return;
    const container = await AstroContainer.create();
    const html = await container.renderToString(page.default, { partial: false });
    const expectedRanges = {
      startingWeeklyRateUsd: { minimum: 500, maximum: 50_000 },
      minimumStayNights: { minimum: 1, maximum: 30 },
      poolHeatFeeUsd: { minimum: 0, maximum: 2_000 },
      petFeeUsd: { minimum: 0, maximum: 1_000 },
      maxPets: { minimum: 0, maximum: 4 },
    } as const;

    for (const [key, expected] of Object.entries(expectedRanges)) {
      const definition = ownerSettingDefinitions[key as keyof typeof expectedRanges] as {
        range?: { minimum: number; maximum: number };
      };
      expect(definition.range, key).toEqual(expected);
    }

    for (const key of ["startingWeeklyRateUsd", "poolHeatFeeUsd", "petFeeUsd"] as const) {
      const expected = expectedRanges[key];
      const input = html.match(new RegExp(`<input[^>]*name="${key}"[^>]*>`))?.[0];
      expect(input, key).toContain(`min="${expected.minimum}"`);
      expect(input, key).toContain(`max="${expected.maximum}"`);
    }

    const minimumStaySelect = html.match(
      /<select[^>]*name="minimumStayNights"[^>]*>[\s\S]*?<\/select>/,
    )?.[0];
    const maximumPetsSelect = html.match(/<select[^>]*name="maxPets"[^>]*>[\s\S]*?<\/select>/)?.[0];
    expect(minimumStaySelect?.match(/<option /g) ?? []).toHaveLength(31);
    expect(maximumPetsSelect?.match(/<option /g) ?? []).toHaveLength(5);
  });

  it("keeps owner routes out of the public sitemap and navigation", async () => {
    expect(siteContent.indexableRoutes.every((route) => !route.startsWith("/owner"))).toBe(true);

    const container = await AstroContainer.create();
    const [header, footer] = await Promise.all([
      container.renderToString(SiteHeader),
      container.renderToString(SiteFooter),
    ]);
    expect(`${header}\n${footer}`).not.toMatch(/href="\/owner(?:\/|")/);
  });
});
