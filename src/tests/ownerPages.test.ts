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
    const page = pages[pagePath] as { default: Parameters<AstroContainer["renderToString"]>[0] } | undefined;
    expect(page).toBeDefined();
    if (!page) return;
    const container = await AstroContainer.create();
    const html = await container.renderToString(page.default, { partial: false });

    expect(html).toContain('<meta name="robots" content="noindex, nofollow">');
    expect(html).toContain('data-analytics-enabled="false"');
    expect(html).not.toMatch(/googletagmanager|clarity\.ms|data-analytics-event/i);
    expect(html).not.toMatch(/sign[ -]?up|create (?:an )?account/i);
  });

  it("renders exactly the shared eight-field dashboard contract and guidance", async () => {
    const page = pages["../pages/owner/dashboard.astro"] as { default: Parameters<AstroContainer["renderToString"]>[0] } | undefined;
    if (!page) return;
    const container = await AstroContainer.create();
    const html = await container.renderToString(page.default, { partial: false });

    for (const [key, definition] of Object.entries(ownerSettingDefinitions)) {
      expect(html).toContain(`name="${key}"`);
      expect(html).toContain(definition.name);
      expect(html).toContain(definition.allowed);
      expect(html).toContain(definition.ownerHelpText);
      expect(html).toContain(definition.publicDestination);
      expect(html).toContain(String(definition.fallback ?? "Not currently published"));
    }
    expect((html.match(/data-owner-setting-field/g) ?? [])).toHaveLength(8);
  });

  it("keeps owner routes out of the public sitemap and navigation", async () => {
    expect(siteContent.indexableRoutes.every((route) => !route.startsWith("/owner"))).toBe(true);

    const container = await AstroContainer.create();
    const [header, footer] = await Promise.all([
      container.renderToString(SiteHeader),
      container.renderToString(SiteFooter),
    ]);
    expect(`${header}\n${footer}`).not.toMatch(/href="\/owner(?:\/|\")/);
  });
});
