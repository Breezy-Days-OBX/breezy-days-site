import { describe, expect, it } from "vitest";

import { addDays, getDateRangeError, toLocalIsoDate } from "./dateRules";

describe("availability date rules", () => {
  it("formats the visitor's local calendar date without a UTC shift", () => {
    expect(toLocalIsoDate(new Date(2026, 7, 14, 23, 30))).toBe("2026-08-14");
  });

  it("requires departure to be at least one day after arrival", () => {
    expect(addDays("2026-08-14", 1)).toBe("2026-08-15");
    expect(getDateRangeError("2026-08-14", "2026-08-14")).toBe(
      "Departure must be after arrival.",
    );
    expect(getDateRangeError("2026-08-14", "2026-08-13")).toBe(
      "Departure must be after arrival.",
    );
    expect(getDateRangeError("2026-08-14", "2026-08-15")).toBe("");
  });

  it("does not flag an incomplete range before both dates are entered", () => {
    expect(getDateRangeError("", "")).toBe("");
    expect(getDateRangeError("2026-08-14", "")).toBe("");
  });
});

