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

  it("renders exactly the shared eight-field dashboard contract and guidance", async () => {
    const page = pages["../pages/owner/dashboard.astro"] as
      { default: Parameters<AstroContainer["renderToString"]>[0] } | undefined;
    if (!page) return;
    const container = await AstroContainer.create();
    const html = await container.renderToString(page.default, {
      partial: false,
    });

    for (const [key, definition] of Object.entries(ownerSettingDefinitions)) {
      expect(html).toContain(`name="${key}"`);
      expect(html).toContain(definition.name);
      expect(html).toContain(definition.allowed);
      expect(html).toContain(definition.ownerHelpText);
      expect(html).toContain(definition.publicDestination);
      expect(html).toContain(String(definition.fallback ?? "Not currently published"));
    }
    expect(html.match(/data-owner-setting-field/g) ?? []).toHaveLength(8);
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

  it("renders native numeric limits from the shared machine-readable field ranges", async () => {
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
      const input = html.match(new RegExp(`<input[^>]*name="${key}"[^>]*>`))?.[0];
      expect(definition.range, key).toEqual(expected);
      expect(input, key).toContain(`min="${expected.minimum}"`);
      expect(input, key).toContain(`max="${expected.maximum}"`);
    }
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
