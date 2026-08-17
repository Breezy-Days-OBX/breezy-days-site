import { describe, expect, it, vi } from "vitest";

const modules = import.meta.glob("./analytics.ts", { eager: true });
type AnalyticsModule = {
  createPublicAnalyticsEvent: (
    name: unknown,
    category: unknown,
    pathname: string,
  ) => { name: string; category: string } | null;
  trackPublicEvent: (name: unknown, category: unknown, pathname?: string) => void;
};

describe("public analytics privacy boundary", () => {
  it("provides the public analytics module", () => {
    expect(modules["./analytics.ts"]).toBeDefined();
  });

  it("allows only fixed event names and fixed non-PII categories", () => {
    const analytics = modules["./analytics.ts"] as AnalyticsModule | undefined;
    if (!analytics) return;

    expect(analytics.createPublicAnalyticsEvent("form_submit", "availability_form", "/")).toEqual({
      name: "form_submit",
      category: "availability_form",
    });
    expect(
      analytics.createPublicAnalyticsEvent("form_submit", "guest@example.com", "/"),
    ).toBeNull();
    expect(
      analytics.createPublicAnalyticsEvent("arrival_2026-09-10", "availability_form", "/"),
    ).toBeNull();
  });

  it("never emits analytics on owner routes", () => {
    const analytics = modules["./analytics.ts"] as AnalyticsModule | undefined;
    if (!analytics) return;

    expect(
      analytics.createPublicAnalyticsEvent("form_start", "availability_form", "/owner"),
    ).toBeNull();
    expect(
      analytics.createPublicAnalyticsEvent("form_start", "availability_form", "/owner/dashboard"),
    ).toBeNull();
  });

  it("sends only the fixed name and category to configured clients", () => {
    const analytics = modules["./analytics.ts"] as AnalyticsModule | undefined;
    if (!analytics) return;
    const gtag = vi.fn();
    const clarity = vi.fn();
    vi.stubGlobal("window", { location: { pathname: "/" }, gtag, clarity });

    analytics.trackPublicEvent("form_validation_error", "availability_form");

    expect(gtag).toHaveBeenCalledWith("event", "form_validation_error", {
      event_category: "availability_form",
    });
    expect(clarity).toHaveBeenCalledWith("event", "form_validation_error");
    expect(JSON.stringify(gtag.mock.calls)).not.toMatch(/email|phone|arrival|departure|message/i);
    vi.unstubAllGlobals();
  });
});
