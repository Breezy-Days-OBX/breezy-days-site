import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";

import { siteContent } from "../content/site";
import HomePage from "../pages/index.astro";

describe("Breezy Days homepage", () => {
  it("renders the approved promise and a clear availability path", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(HomePage, { partial: false });

    expect(html).toContain("Make room for the week everyone remembers.");
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain('id="availability"');
    expect(html).toContain('name="arrival"');
    expect(html).toContain('name="departure"');
    expect(html).toContain('name="guests"');
    expect(html).toContain("Check availability");
    expect(html).toContain("not a reservation");
    expect(html).toMatch(/<h2[^>]+id="reviews-title"/);
    expect(html).toContain('href="/privacy"');
    expect(html).toMatch(/<p[^>]+class="honeypot"[^>]+hidden/);
  });

  it("keeps the decision sections in the approved funnel order", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(HomePage);
    const ids = siteContent.homepageSections;

    const positions = ids.map((id) => html.indexOf(`id="${id}"`));

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("uses real property photography with descriptive alternative text", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(HomePage);

    expect(html).toContain("View from the Breezy Days deck toward neighboring Outer Banks homes");
    expect(html).not.toContain("Hero-Reference");
    expect(html).not.toContain("prototype only");
  });
});
