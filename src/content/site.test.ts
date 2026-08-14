import { describe, expect, it } from "vitest";

import { siteContent } from "./site";

describe("Breezy Days public-site contract", () => {
  it("keeps one dominant availability action", () => {
    expect(siteContent.primaryAction).toEqual({
      label: "Check availability",
      href: "#availability",
    });
  });

  it("describes an owner-confirmed request instead of promising an instant reservation", () => {
    expect(siteContent.booking.mode).toBe("request-to-book");
    expect(siteContent.booking.disclaimer).toMatch(/request/i);
    expect(siteContent.booking.disclaimer).toMatch(/owner confirms/i);
    expect(siteContent.booking.disclaimer).toMatch(/not a reservation/i);
  });

  it("orders the homepage around a guest's booking decision", () => {
    expect(siteContent.homepageSections).toEqual([
      "hero",
      "availability",
      "fit",
      "home",
      "essentials",
      "reviews",
      "process",
      "location",
      "faq",
      "final-action",
    ]);
  });

  it("marks marketplace proof for launch-day reverification", () => {
    expect(siteContent.marketplaceProof.checkedOn).toBe("2026-08-07");
    expect(siteContent.marketplaceProof.requiresLaunchReverification).toBe(true);
  });
});

