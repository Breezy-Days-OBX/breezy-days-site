import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";

import marketplaceProof from "../content/marketplace-proof.json";

const modules = import.meta.glob("./MarketplaceProof.astro", { eager: true });

describe("marketplace proof gate", () => {
  it("renders no claims while reverification is required", async () => {
    const module = modules["./MarketplaceProof.astro"] as
      | { default: Parameters<AstroContainer["renderToString"]>[0] }
      | undefined;
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

  it("renders the centralized approved proof after reverification", async () => {
    const module = modules["./MarketplaceProof.astro"] as
      | { default: Parameters<AstroContainer["renderToString"]>[0] }
      | undefined;
    if (!module) return;
    const container = await AstroContainer.create();
    const html = await container.renderToString(module.default, {
      props: { proof: { ...marketplaceProof, requiresLaunchReverification: false } },
    });

    expect(html).toContain(marketplaceProof.airbnb.rating);
    expect(html).toContain(String(marketplaceProof.airbnb.reviewCount));
    expect(html).toContain(marketplaceProof.vrbo.rating.replace("/10", ""));
    expect(html).toContain(String(marketplaceProof.vrbo.reviewCount));
    expect(html).toContain(marketplaceProof.quote.text);
    expect(html).toContain(marketplaceProof.quote.source);
  });
});
