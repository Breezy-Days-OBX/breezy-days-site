import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, it } from "vitest";

const pages = import.meta.glob("../pages/*.{astro,ts}", { eager: true });

describe("public page map", () => {
  it("includes every approved public route", () => {
    expect(Object.keys(pages)).toEqual(
      expect.arrayContaining([
        "../pages/index.astro",
        "../pages/thanks.astro",
        "../pages/privacy.astro",
        "../pages/rental-information.astro",
        "../pages/404.astro",
        "../pages/sitemap.xml.ts",
      ]),
    );
  });

  it.each([
    ["thanks", "../pages/thanks.astro", "not a reservation"],
    ["privacy", "../pages/privacy.astro", "Privacy"],
  ])("renders the %s page without prototype language", async (_name, path, requiredCopy) => {
    const page = pages[path] as {
      default: Parameters<AstroContainer["renderToString"]>[0];
    };
    const container = await AstroContainer.create();
    const html = await container.renderToString(page.default, {
      partial: false,
    });

    expect(html).toContain(requiredCopy);
    expect(html).not.toMatch(/prototype|prelaunch|TBD|TODO/i);
    expect(html).not.toContain('href="/owner');
  });

  it("links visitors to the analytics providers' privacy information", async () => {
    const page = pages["../pages/privacy.astro"] as {
      default: Parameters<AstroContainer["renderToString"]>[0];
    };
    const container = await AstroContainer.create();
    const html = await container.renderToString(page.default, {
      partial: false,
    });

    expect(html).toContain("https://policies.google.com/technologies/partner-sites");
    expect(html).toContain("https://privacy.microsoft.com/privacystatement");
    expect(html).toMatch(/heatmaps/i);
    expect(html).toMatch(/session replays/i);
  });

  it("renders the complete pet policy as one live-updated rental detail", async () => {
    const page = pages["../pages/rental-information.astro"] as {
      default: Parameters<AstroContainer["renderToString"]>[0];
    };
    const container = await AstroContainer.create();
    const html = await container.renderToString(page.default, { partial: false });

    expect(html).toContain('data-public-setting="petPolicyDetails"');
    expect(html).toContain("Up to 2 pets; $150 per stay for additional cleaning");
  });
});
