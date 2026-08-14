import { describe, expect, it } from "vitest";

import {
  OWNER_SETTINGS_SCHEMA_VERSION,
  ownerSettingDefinitions,
  ownerSettingsDefaults,
} from "../ownerSettings";

const modules = import.meta.glob("./ownerForm.ts", { eager: true });

type OwnerFormModule = {
  OWNER_EDITABLE_KEYS: readonly string[];
  serializeOwnerSettings: (
    entries: Iterable<readonly [string, FormDataEntryValue]>,
    updatedAt: string,
  ) =>
    | { success: true; data: Record<string, unknown> }
    | { success: false; errors: readonly string[]; fieldErrors: Record<string, string> };
};

const validEntries = () => Object.entries({
  startingWeeklyRateUsd: "3500",
  minimumStayNights: "7",
  pricingNote: "Owner-approved rates are confirmed for requested dates.",
  poolHeatFeeUsd: "250",
  petFeeUsd: "150",
  maxPets: "2",
  poolOpenMonthDay: "04-15",
  poolCloseMonthDay: "10-15",
});

describe("owner form contract", () => {
  it("exports the serializer using the exact Task 1 field order", () => {
    const ownerForm = modules["./ownerForm.ts"] as OwnerFormModule | undefined;

    expect(ownerForm).toBeDefined();
    if (!ownerForm) return;
    expect(ownerForm.OWNER_EDITABLE_KEYS).toEqual(Object.keys(ownerSettingDefinitions));
  });

  it("serializes only a complete eight-field form into the validated save contract", () => {
    const ownerForm = modules["./ownerForm.ts"] as OwnerFormModule | undefined;
    if (!ownerForm) return;

    const updatedAt = "2026-08-14T15:00:00.000Z";
    const result = ownerForm.serializeOwnerSettings(validEntries(), updatedAt);

    expect(result).toEqual({
      success: true,
      data: {
        schemaVersion: OWNER_SETTINGS_SCHEMA_VERSION,
        startingWeeklyRateUsd: 3500,
        minimumStayNights: 7,
        pricingNote: "Owner-approved rates are confirmed for requested dates.",
        poolHeatFeeUsd: 250,
        petFeeUsd: 150,
        maxPets: 2,
        poolOpenMonthDay: "04-15",
        poolCloseMonthDay: "10-15",
        updatedAt,
      },
    });
    if (result.success) {
      expect(Object.keys(result.data)).toEqual([
        "schemaVersion",
        ...Object.keys(ownerSettingDefinitions),
        "updatedAt",
      ]);
    }
  });

  it("converts blank provisional values to null and rejects every extra or missing form key", () => {
    const ownerForm = modules["./ownerForm.ts"] as OwnerFormModule | undefined;
    if (!ownerForm) return;

    const blanks = validEntries().map(([key, value]) =>
      key === "startingWeeklyRateUsd" || key === "minimumStayNights" ? [key, ""] as const : [key, value] as const,
    );
    const serialized = ownerForm.serializeOwnerSettings(blanks, "2026-08-14T15:00:00.000Z");
    expect(serialized.success && serialized.data.startingWeeklyRateUsd).toBeNull();
    expect(serialized.success && serialized.data.minimumStayNights).toBeNull();

    expect(ownerForm.serializeOwnerSettings(
      [...validEntries(), ["ownerEmail", "private@example.test"]],
      "2026-08-14T15:00:00.000Z",
    )).toMatchObject({ success: false, errors: ["settings.unknown_key"] });
    expect(ownerForm.serializeOwnerSettings(
      validEntries().slice(1),
      "2026-08-14T15:00:00.000Z",
    )).toMatchObject({ success: false, errors: ["settings.missing_key"] });
  });

  it("maps shared validation codes to field-specific, non-sensitive owner guidance", () => {
    const ownerForm = modules["./ownerForm.ts"] as OwnerFormModule | undefined;
    if (!ownerForm) return;

    const invalidEntries = validEntries().map(([key, value]) =>
      key === "maxPets" ? [key, "5"] as const : [key, value] as const,
    );
    const result = ownerForm.serializeOwnerSettings(
      invalidEntries,
      "2026-08-14T15:00:00.000Z",
    );

    expect(result).toMatchObject({
      success: false,
      errors: ["maxPets.invalid"],
      fieldErrors: { maxPets: ownerSettingDefinitions.maxPets.allowed },
    });
    expect(JSON.stringify(result)).not.toMatch(/stack|blob|token|email/i);
  });

  it("keeps the shared defaults valid as form input", () => {
    const ownerForm = modules["./ownerForm.ts"] as OwnerFormModule | undefined;
    if (!ownerForm) return;

    const entries = Object.entries(ownerSettingsDefaults).map(([key, value]) => [
      key,
      value === null ? "" : String(value),
    ] as const);
    expect(ownerForm.serializeOwnerSettings(entries, "2026-08-14T15:00:00.000Z").success).toBe(true);
  });
});
