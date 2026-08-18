import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";

import marketplaceProof from "../content/marketplace-proof.json";

const modules = import.meta.glob("./HeroMarketplaceProof.astro", { eager: true });

const approvedProof = {
  checkedOn: "2026-08-18",
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
    text: "A permissioned family-trip review.",
    source: "Verified fixture guest",
    permission: "approved",
  },
};

describe("hero marketplace proof", () => {
  it("combines visible ratings, review counts, and the permissioned quote", async () => {
    const module = modules["./HeroMarketplaceProof.astro"] as
      { default: Parameters<AstroContainer["renderToString"]>[0] } | undefined;
    expect(module).toBeDefined();
    if (!module) return;

    const container = await AstroContainer.create();
    const html = await container.renderToString(module.default, {
      props: { proof: approvedProof },
    });

    expect(html).toContain("★★★★★");
    expect(html).toContain("Airbnb 4.9 (39 reviews)");
    expect(html).toContain("Vrbo 9.4/10 (88 verified reviews)");
    expect(html).toContain(approvedProof.quote.text);
    expect(html).toContain(approvedProof.quote.source);
  });

  it("can preview the final proof composition locally without weakening the production gate", async () => {
    const module = modules["./HeroMarketplaceProof.astro"] as
      { default: Parameters<AstroContainer["renderToString"]>[0] } | undefined;
    if (!module) return;

    const container = await AstroContainer.create();
    const hiddenHtml = await container.renderToString(module.default, {
      props: { proof: marketplaceProof },
    });
    const previewHtml = await container.renderToString(module.default, {
      props: { proof: marketplaceProof, preview: true },
    });

    expect(hiddenHtml).not.toContain(marketplaceProof.quote.text);
    expect(previewHtml).toContain(marketplaceProof.airbnb.rating);
    expect(previewHtml).toContain(marketplaceProof.vrbo.rating);
    expect(previewHtml).toContain(marketplaceProof.quote.text);
  });
});
