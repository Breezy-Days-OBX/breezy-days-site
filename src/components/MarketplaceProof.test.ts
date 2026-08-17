import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";

import marketplaceProof from "../content/marketplace-proof.json";

const modules = import.meta.glob("./MarketplaceProof.astro", { eager: true });

const approvedProof = {
  checkedOn: "2026-08-17",
  checkedOnDisplay: "Never render this disconnected display value",
  requiresLaunchReverification: false,
  airbnb: {
    rating: "4.9",
    label: "Guest Favorite",
    reviewCount: 39,
    link: "https://fixture.example.test/airbnb",
  },
  vrbo: {
    rating: "9.4/10",
    reviewCount: 88,
    link: "https://fixture.example.test/vrbo",
  },
  quote: {
    text: "Permissioned fixture quote.",
    source: "Fixture guest",
    permission: "approved",
  },
};

describe("marketplace proof gate", () => {
  it("renders no claims while reverification is required", async () => {
    const module = modules["./MarketplaceProof.astro"] as
      { default: Parameters<AstroContainer["renderToString"]>[0] } | undefined;
    expect(module).toBeDefined();
    if (!module) return;

    const container = await AstroContainer.create();
    const html = await container.renderToString(module.default, {
      props: { proof: marketplaceProof },
    });

    expect(html).not.toContain(marketplaceProof.airbnb.rating);
    expect(html).not.toContain(marketplaceProof.vrbo.rating);
    expect(html).not.toContain(marketplaceProof.quote.text);
  });

  it("withholds the complete proof surface when quote permission is not approved", async () => {
    const module = modules["./MarketplaceProof.astro"] as
      { default: Parameters<AstroContainer["renderToString"]>[0] } | undefined;
    if (!module) return;
    const container = await AstroContainer.create();
    const html = await container.renderToString(module.default, {
      props: {
        proof: {
          ...approvedProof,
          quote: { text: "Unapproved fixture quote.", source: "Fixture guest" },
        },
      },
    });

    expect(html).not.toContain(approvedProof.airbnb.rating);
    expect(html).not.toContain(approvedProof.airbnb.link);
    expect(html).not.toContain("Unapproved fixture quote.");
  });

  it("renders gated secondary links, fixed analytics categories, and a date derived from checkedOn", async () => {
    const module = modules["./MarketplaceProof.astro"] as
      { default: Parameters<AstroContainer["renderToString"]>[0] } | undefined;
    if (!module) return;
    const container = await AstroContainer.create();
    const html = await container.renderToString(module.default, {
      props: { proof: approvedProof },
    });

    expect(html).toContain(approvedProof.quote.text);
    expect(html).toContain(approvedProof.quote.source);
    expect(html).toContain("Ratings checked August 17, 2026.");
    expect(html).not.toContain(approvedProof.checkedOnDisplay);
    expect(html).toContain(`href="${approvedProof.airbnb.link}"`);
    expect(html).toContain(`href="${approvedProof.vrbo.link}"`);
    expect(html.match(/data-analytics-event="marketplace_outbound_click"/g) ?? []).toHaveLength(2);
    expect(html).toContain('data-analytics-category="marketplace_airbnb"');
    expect(html).toContain('data-analytics-category="marketplace_vrbo"');
  });
});
