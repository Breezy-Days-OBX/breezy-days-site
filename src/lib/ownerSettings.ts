import { property } from "../content/property";
import { isValidIsoDate } from "./dateRules";

export const OWNER_SETTINGS_SCHEMA_VERSION = 1 as const;

export const ownerSettingsDefaults = {
  startingWeeklyRateUsd: null,
  minimumStayNights: null,
  pricingNote: "Rates vary by dates and are confirmed in your personalized quote.",
  poolHeatFeeUsd: property.pool.heatFeeUsd,
  petFeeUsd: property.pets.feeUsd,
  maxPets: property.pets.maximum,
  poolOpenMonthDay: property.pool.openMonthDay,
  poolCloseMonthDay: property.pool.closeMonthDay,
} satisfies OwnerEditableSettings;

export interface OwnerEditableSettings {
  startingWeeklyRateUsd: number | null;
  minimumStayNights: number | null;
  pricingNote: string;
  poolHeatFeeUsd: number;
  petFeeUsd: number;
  maxPets: number;
  poolOpenMonthDay: string;
  poolCloseMonthDay: string;
}

export interface OwnerSettings extends OwnerEditableSettings {
  schemaVersion: typeof OWNER_SETTINGS_SCHEMA_VERSION;
  updatedAt: string;
}

export type PublicOwnerSettings = OwnerEditableSettings & { updatedAt: string };

interface OwnerSettingDefinition<T> {
  name: string;
  purpose: string;
  type: "nullable integer" | "integer" | "plain text" | "month-day";
  allowed: string;
  publicDestination: string;
  fallback: T;
  ownerHelpText: string;
}

export const ownerSettingDefinitions: {
  [Key in keyof OwnerEditableSettings]: OwnerSettingDefinition<OwnerEditableSettings[Key]>;
} = {
  startingWeeklyRateUsd: {
    name: "Starting weekly rate",
    purpose: "Optionally publish a starting point for a seven-night stay.",
    type: "nullable integer",
    allowed: "Whole US dollars from $500 through $50,000, or blank.",
    publicDestination: "Public pricing summary",
    fallback: ownerSettingsDefaults.startingWeeklyRateUsd,
    ownerHelpText: "Leave blank until an owner-approved starting weekly rate is ready to publish.",
  },
  minimumStayNights: {
    name: "Minimum stay",
    purpose: "Optionally publish the current minimum number of nights.",
    type: "nullable integer",
    allowed: "A whole number from 1 through 30, or blank.",
    publicDestination: "Public pricing summary and availability guidance",
    fallback: ownerSettingsDefaults.minimumStayNights,
    ownerHelpText:
      "Leave blank when the minimum stay varies or has not been approved for publication.",
  },
  pricingNote: {
    name: "Pricing note",
    purpose: "Explain that the owner confirms date-specific pricing.",
    type: "plain text",
    allowed: "1–160 plain-text characters; markup is not allowed.",
    publicDestination: "Public pricing summary",
    fallback: ownerSettingsDefaults.pricingNote,
    ownerHelpText: "Keep this factual and brief; do not paste HTML or scripts.",
  },
  poolHeatFeeUsd: {
    name: "Pool heat fee",
    purpose: "Publish the optional pool-heating fee per stay.",
    type: "integer",
    allowed: "Whole US dollars from $0 through $2,000.",
    publicDestination: "Pool details and rental information",
    fallback: ownerSettingsDefaults.poolHeatFeeUsd,
    ownerHelpText: "Enter the complete per-stay fee in whole dollars.",
  },
  petFeeUsd: {
    name: "Pet fee",
    purpose: "Publish the additional cleaning fee for an approved pet stay.",
    type: "integer",
    allowed: "Whole US dollars from $0 through $1,000.",
    publicDestination: "Pet policy and rental information",
    fallback: ownerSettingsDefaults.petFeeUsd,
    ownerHelpText: "Enter the complete per-stay pet fee in whole dollars.",
  },
  maxPets: {
    name: "Maximum pets",
    purpose: "Publish the largest number of pets allowed with a stay.",
    type: "integer",
    allowed: "A whole number from 0 through 4.",
    publicDestination: "Pet policy and availability form guidance",
    fallback: ownerSettingsDefaults.maxPets,
    ownerHelpText: "Use 0 when pets are not allowed; otherwise enter the current maximum.",
  },
  poolOpenMonthDay: {
    name: "Pool opening date",
    purpose: "Publish the recurring first day of the seasonal pool period.",
    type: "month-day",
    allowed: "A real calendar month and day in MM-DD format.",
    publicDestination: "Pool details and rental information",
    fallback: ownerSettingsDefaults.poolOpenMonthDay,
    ownerHelpText: "Use two digits for both month and day, such as 04-15.",
  },
  poolCloseMonthDay: {
    name: "Pool closing date",
    purpose: "Publish the recurring final day of the seasonal pool period.",
    type: "month-day",
    allowed: "A real calendar month and day in MM-DD format.",
    publicDestination: "Pool details and rental information",
    fallback: ownerSettingsDefaults.poolCloseMonthDay,
    ownerHelpText: "Use two digits for both month and day, such as 10-15.",
  },
};

export type OwnerSettingsValidationResult =
  { success: true; data: OwnerSettings } | { success: false; errors: readonly string[] };

const allowedKeys = new Set([
  "schemaVersion",
  ...Object.keys(ownerSettingDefinitions),
  "updatedAt",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isIntegerInRange = (value: unknown, minimum: number, maximum: number) =>
  Number.isInteger(value) && Number(value) >= minimum && Number(value) <= maximum;

const isNullableIntegerInRange = (value: unknown, minimum: number, maximum: number) =>
  value === null || isIntegerInRange(value, minimum, maximum);

const isPlainText = (value: unknown) => {
  if (typeof value !== "string" || value.length < 1 || value.length > 160) return false;
  return !Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return character === "<" || character === ">" || code <= 31 || code === 127;
  });
};

const isMonthDay = (value: unknown) =>
  typeof value === "string" && /^\d{2}-\d{2}$/.test(value) && isValidIsoDate(`2000-${value}`);

export const isValidIsoTimestamp = (value: unknown) => {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?Z$/.exec(value);
  if (!match) return false;

  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match;
  const [year, month, day, hour, minute, second] = [
    yearText,
    monthText,
    dayText,
    hourText,
    minuteText,
    secondText,
  ].map(Number);
  const parsed = new Date(value);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day &&
    parsed.getUTCHours() === hour &&
    parsed.getUTCMinutes() === minute &&
    parsed.getUTCSeconds() === second
  );
};

export function validateOwnerSettings(input: unknown): OwnerSettingsValidationResult {
  if (!isRecord(input)) return { success: false, errors: ["settings.invalid_type"] };

  const errors: string[] = [];
  if (Object.keys(input).some((key) => !allowedKeys.has(key))) errors.push("settings.unknown_key");
  if (input.schemaVersion !== OWNER_SETTINGS_SCHEMA_VERSION) errors.push("schemaVersion.invalid");
  if (!isNullableIntegerInRange(input.startingWeeklyRateUsd, 500, 50_000)) {
    errors.push("startingWeeklyRateUsd.invalid");
  }
  if (!isNullableIntegerInRange(input.minimumStayNights, 1, 30)) {
    errors.push("minimumStayNights.invalid");
  }
  if (!isPlainText(input.pricingNote)) errors.push("pricingNote.invalid");
  if (!isIntegerInRange(input.poolHeatFeeUsd, 0, 2_000)) errors.push("poolHeatFeeUsd.invalid");
  if (!isIntegerInRange(input.petFeeUsd, 0, 1_000)) errors.push("petFeeUsd.invalid");
  if (!isIntegerInRange(input.maxPets, 0, 4)) errors.push("maxPets.invalid");
  if (!isMonthDay(input.poolOpenMonthDay)) errors.push("poolOpenMonthDay.invalid");
  if (!isMonthDay(input.poolCloseMonthDay)) errors.push("poolCloseMonthDay.invalid");
  if (!isValidIsoTimestamp(input.updatedAt)) errors.push("updatedAt.invalid");

  if (errors.length > 0) return { success: false, errors };

  return {
    success: true,
    data: {
      schemaVersion: OWNER_SETTINGS_SCHEMA_VERSION,
      startingWeeklyRateUsd: input.startingWeeklyRateUsd as number | null,
      minimumStayNights: input.minimumStayNights as number | null,
      pricingNote: input.pricingNote as string,
      poolHeatFeeUsd: input.poolHeatFeeUsd as number,
      petFeeUsd: input.petFeeUsd as number,
      maxPets: input.maxPets as number,
      poolOpenMonthDay: input.poolOpenMonthDay as string,
      poolCloseMonthDay: input.poolCloseMonthDay as string,
      updatedAt: input.updatedAt as string,
    },
  };
}

export function projectPublicOwnerSettings(settings: OwnerSettings): PublicOwnerSettings {
  return {
    startingWeeklyRateUsd: settings.startingWeeklyRateUsd,
    minimumStayNights: settings.minimumStayNights,
    pricingNote: settings.pricingNote,
    poolHeatFeeUsd: settings.poolHeatFeeUsd,
    petFeeUsd: settings.petFeeUsd,
    maxPets: settings.maxPets,
    poolOpenMonthDay: settings.poolOpenMonthDay,
    poolCloseMonthDay: settings.poolCloseMonthDay,
    updatedAt: settings.updatedAt,
  };
}

export function parsePublicOwnerSettings(input: unknown): PublicOwnerSettings | null {
  if (!isRecord(input)) return null;

  const publicKeys = new Set([...Object.keys(ownerSettingDefinitions), "updatedAt"]);
  if (
    Object.keys(input).length !== publicKeys.size ||
    Object.keys(input).some((key) => !publicKeys.has(key))
  ) {
    return null;
  }

  const result = validateOwnerSettings({
    ...input,
    schemaVersion: OWNER_SETTINGS_SCHEMA_VERSION,
  });
  return result.success ? projectPublicOwnerSettings(result.data) : null;
}
