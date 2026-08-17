import { describe, expect, it } from "vitest";

import {
  OWNER_SETTINGS_SCHEMA_VERSION,
  type OwnerSettings,
  ownerSettingDefinitions,
  ownerSettingsDefaults,
  projectPublicOwnerSettings,
  validateOwnerSettings,
} from "./ownerSettings";
import * as ownerSettingsModule from "./ownerSettings";

const validSettings: OwnerSettings = {
  schemaVersion: 1,
  ...ownerSettingsDefaults,
  updatedAt: "2026-08-14T15:00:00.000Z",
};

describe("owner settings contract", () => {
  it("defines exactly the provisional allow-listed fields with complete owner guidance", () => {
    expect(OWNER_SETTINGS_SCHEMA_VERSION).toBe(1);
    expect(Object.keys(ownerSettingDefinitions)).toEqual([
      "startingWeeklyRateUsd",
      "minimumStayNights",
      "pricingNote",
      "poolHeatFeeUsd",
      "petFeeUsd",
      "maxPets",
      "poolOpenMonthDay",
      "poolCloseMonthDay",
    ]);

    for (const [key, definition] of Object.entries(ownerSettingDefinitions)) {
      expect(definition.name, key).not.toBe("");
      expect(definition.purpose, key).not.toBe("");
      expect(definition.type, key).not.toBe("");
      expect(definition.allowed, key).not.toBe("");
      expect(definition.publicDestination, key).not.toBe("");
      expect(definition.ownerHelpText, key).not.toBe("");
      expect(definition.fallback, key).toBe(
        ownerSettingsDefaults[key as keyof typeof ownerSettingsDefaults],
      );
    }
  });

  it("uses only the approved repository defaults", () => {
    expect(ownerSettingsDefaults).toEqual({
      startingWeeklyRateUsd: null,
      minimumStayNights: null,
      pricingNote: "Rates vary by dates and are confirmed in your personalized quote.",
      poolHeatFeeUsd: 250,
      petFeeUsd: 150,
      maxPets: 2,
      poolOpenMonthDay: "04-15",
      poolCloseMonthDay: "10-15",
    });
  });

  it("accepts all inclusive numeric boundaries and nullable provisional values", () => {
    expect(
      validateOwnerSettings({
        ...validSettings,
        startingWeeklyRateUsd: 500,
        minimumStayNights: 1,
        poolHeatFeeUsd: 0,
        petFeeUsd: 0,
        maxPets: 0,
      }).success,
    ).toBe(true);
    expect(
      validateOwnerSettings({
        ...validSettings,
        startingWeeklyRateUsd: 50_000,
        minimumStayNights: 30,
        poolHeatFeeUsd: 2_000,
        petFeeUsd: 1_000,
        maxPets: 4,
      }).success,
    ).toBe(true);
    expect(validateOwnerSettings(validSettings).success).toBe(true);
  });

  it.each([
    ["startingWeeklyRateUsd", 499],
    ["startingWeeklyRateUsd", 50_001],
    ["minimumStayNights", 0],
    ["minimumStayNights", 31],
    ["poolHeatFeeUsd", -1],
    ["poolHeatFeeUsd", 2_001],
    ["petFeeUsd", -1],
    ["petFeeUsd", 1_001],
    ["maxPets", -1],
    ["maxPets", 5],
  ])("rejects %s outside its allowed range", (field, value) => {
    expect(validateOwnerSettings({ ...validSettings, [field]: value }).success).toBe(false);
  });

  it.each(["startingWeeklyRateUsd", "minimumStayNights", "poolHeatFeeUsd", "petFeeUsd", "maxPets"])(
    "rejects non-integer numeric field %s",
    (field) => {
      expect(validateOwnerSettings({ ...validSettings, [field]: 1.5 }).success).toBe(false);
      expect(validateOwnerSettings({ ...validSettings, [field]: "2" }).success).toBe(false);
    },
  );

  it("enforces pricing-note length boundaries and rejects markup", () => {
    expect(validateOwnerSettings({ ...validSettings, pricingNote: "x" }).success).toBe(true);
    expect(validateOwnerSettings({ ...validSettings, pricingNote: "x".repeat(160) }).success).toBe(
      true,
    );
    expect(validateOwnerSettings({ ...validSettings, pricingNote: "" }).success).toBe(false);
    expect(validateOwnerSettings({ ...validSettings, pricingNote: "x".repeat(161) }).success).toBe(
      false,
    );
    expect(
      validateOwnerSettings({
        ...validSettings,
        pricingNote: "<strong>Call for rates</strong>",
      }).success,
    ).toBe(false);
  });

  it("normalizes pricing-note whitespace before enforcing the 1–160 character boundaries", () => {
    const trimmed = validateOwnerSettings({ ...validSettings, pricingNote: "  Quote by dates.  " });
    expect(trimmed.success).toBe(true);
    if (trimmed.success) expect(trimmed.data.pricingNote).toBe("Quote by dates.");

    expect(validateOwnerSettings({ ...validSettings, pricingNote: " \t\n " }).success).toBe(false);

    const paddedBoundary = validateOwnerSettings({
      ...validSettings,
      pricingNote: `  ${"x".repeat(160)}  `,
    });
    expect(paddedBoundary.success).toBe(true);
    if (paddedBoundary.success) expect(paddedBoundary.data.pricingNote).toBe("x".repeat(160));
    expect(
      validateOwnerSettings({
        ...validSettings,
        pricingNote: ` ${"x".repeat(161)} `,
      }).success,
    ).toBe(false);
  });

  it("accepts real month-days and rejects malformed or impossible dates", () => {
    expect(validateOwnerSettings({ ...validSettings, poolOpenMonthDay: "02-29" }).success).toBe(
      true,
    );
    for (const value of ["2-01", "02-30", "00-10", "13-01", "04/15"]) {
      expect(
        validateOwnerSettings({ ...validSettings, poolOpenMonthDay: value }).success,
        value,
      ).toBe(false);
    }
  });

  it("rejects unknown keys, wrong schema versions, and malformed timestamps", () => {
    expect(validateOwnerSettings({ ...validSettings, internalNote: "private" }).success).toBe(
      false,
    );
    expect(validateOwnerSettings({ ...validSettings, schemaVersion: 2 }).success).toBe(false);
    for (const updatedAt of ["", "2026-08-14", "not-a-timestamp", "2026-02-30T12:00:00Z"]) {
      expect(validateOwnerSettings({ ...validSettings, updatedAt }).success, updatedAt).toBe(false);
    }
  });

  it("projects only approved public fields and updatedAt", () => {
    const storedSettings: OwnerSettings & {
      internalNote: string;
      ownerEmail: string;
    } = {
      ...validSettings,
      internalNote: "never public",
      ownerEmail: "private@example.com",
    };
    const publicSettings = projectPublicOwnerSettings(storedSettings);

    expect(publicSettings).toEqual({
      ...ownerSettingsDefaults,
      updatedAt: validSettings.updatedAt,
    });
    expect(publicSettings).not.toHaveProperty("schemaVersion");
    expect(publicSettings).not.toHaveProperty("internalNote");
    expect(publicSettings).not.toHaveProperty("ownerEmail");
  });

  it("accepts only a complete sanitized live public-settings response", () => {
    const parsePublicOwnerSettings = (
      ownerSettingsModule as typeof ownerSettingsModule & {
        parsePublicOwnerSettings?: (input: unknown) => unknown;
      }
    ).parsePublicOwnerSettings;
    expect(parsePublicOwnerSettings).toBeTypeOf("function");
    if (!parsePublicOwnerSettings) return;

    expect(
      parsePublicOwnerSettings({
        ...ownerSettingsDefaults,
        updatedAt: validSettings.updatedAt,
      }),
    ).toEqual({
      ...ownerSettingsDefaults,
      updatedAt: validSettings.updatedAt,
    });

    expect(parsePublicOwnerSettings({ ...ownerSettingsDefaults, source: "default" })).toBeNull();
    expect(
      parsePublicOwnerSettings({
        ...ownerSettingsDefaults,
        updatedAt: validSettings.updatedAt,
        ownerEmail: "private@example.com",
      }),
    ).toBeNull();
    expect(
      parsePublicOwnerSettings({
        ...ownerSettingsDefaults,
        maxPets: 99,
        updatedAt: validSettings.updatedAt,
      }),
    ).toBeNull();
  });
});
