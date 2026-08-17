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

  it("qualifies family fit and answers practical objections with approved facts", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(HomePage, { partial: false });

    expect(html).toContain("Multi-generational families and family groups sharing a beach week");
    expect(html).toContain("Sleeps up to 10 guests");
    expect(html).toContain("4 bedrooms");
    expect(html).toContain("2 full bathrooms and 1 half bathroom");
    expect(html).toContain("full flight of stairs is required");
    expect(html).toContain("Beach/pool towels");
    expect(html).toContain("An inquiry is not a confirmed reservation");
    expect(html).toContain("Hosted by Danny &amp; Michelle Day");
  });

  it("uses one dominant CTA path and does not leak owner routes", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(HomePage, { partial: false });
    const primaryActions = [
      ...html.matchAll(
        /<(?:a|button)[^>]*(?:button|mobile-booking-bar)[^>]*>([\s\S]*?)<\/(?:a|button)>/g,
      ),
    ]
      .map((match) => match[1].replace(/<[^>]+>/g, "").trim())
      .filter(Boolean);

    expect(primaryActions).toContain("Check availability");
    expect(primaryActions).not.toContain("Book now");
    expect(primaryActions).not.toContain("Reserve now");
    expect(html).not.toContain('href="/owner');
  });

  it("renders the complete static Netlify inquiry contract and accessible states", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(HomePage, { partial: false });

    for (const name of [
      "arrival",
      "departure",
      "guests",
      "pets",
      "name",
      "email",
      "phone",
      "message",
      "acknowledgesRequestNotReservation",
      "acknowledgesPrivacy",
    ]) {
      expect(html, name).toContain(`name="${name}"`);
    }
    expect(html).toContain('name="availability-request"');
    expect(html).toContain('method="POST"');
    expect(html).toContain('action="/thanks"');
    expect(html).toContain('data-netlify="true"');
    expect(html).toContain('netlify-honeypot="company-website"');
    expect(html).toContain("data-form-error-summary");
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('aria-busy="false"');
    expect(html).not.toMatch(/<form[^>]+novalidate/i);
    expect(html).toContain("data-max-pets-select");
  });

  it("withholds marketplace proof until the centralized reverification gate is cleared", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(HomePage, { partial: false });
    const proof = siteContent.marketplaceProof;

    expect(proof.requiresLaunchReverification).toBe(true);
    expect(html).not.toContain(proof.quote.text);
    expect(html).not.toContain(proof.quote.source);
    expect(html).not.toContain(`${proof.airbnb.reviewCount} reviews`);
    expect(html).not.toContain(`${proof.vrbo.reviewCount} reviews`);
    expect(html).not.toContain(proof.airbnb.rating);
    expect(html).not.toContain(proof.vrbo.rating);
    expect(html).not.toMatch(/launch reverification|marketplace snapshot/i);
    expect(html).toContain("Why this home");
  });

  it("ships repository defaults with allow-listed public-settings markers", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(HomePage, { partial: false });

    for (const key of [
      "startingWeeklyRateUsd",
      "minimumStayNights",
      "pricingNote",
      "poolHeatFeeUsd",
      "petFeeUsd",
      "maxPets",
      "poolOpenMonthDay",
      "poolCloseMonthDay",
    ]) {
      expect(html, key).toContain(`data-public-setting="${key}"`);
    }
    expect(html).toContain("Rates vary by dates and are confirmed in your personalized quote.");
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
    expect(html).not.toMatch(/prelaunch|being verified|still being verified|TBD|TODO/i);
  });
});
