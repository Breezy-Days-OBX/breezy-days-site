import {
  OWNER_SETTINGS_SCHEMA_VERSION,
  ownerSettingDefinitions,
  validateOwnerSettings,
  type OwnerSettings,
} from "../ownerSettings";

export const OWNER_EDITABLE_KEYS = Object.freeze(
  Object.keys(ownerSettingDefinitions) as Array<keyof typeof ownerSettingDefinitions>,
);

export type OwnerFieldErrors = Partial<Record<keyof typeof ownerSettingDefinitions, string>>;

export type OwnerFormResult =
  | { success: true; data: OwnerSettings }
  | {
      success: false;
      errors: readonly string[];
      fieldErrors: OwnerFieldErrors;
    };

const nullableIntegerFields = new Set<keyof typeof ownerSettingDefinitions>([
  "startingWeeklyRateUsd",
  "minimumStayNights",
]);

const integerFields = new Set<keyof typeof ownerSettingDefinitions>([
  ...nullableIntegerFields,
  "poolHeatFeeUsd",
  "petFeeUsd",
  "maxPets",
]);

const monthDayFields = new Set<keyof typeof ownerSettingDefinitions>([
  "poolOpenMonthDay",
  "poolCloseMonthDay",
]);

export function mapOwnerSettingsErrors(errors: readonly string[]): OwnerFieldErrors {
  const mapped: OwnerFieldErrors = {};
  for (const error of errors) {
    const field = error.replace(/\.invalid$/, "") as keyof typeof ownerSettingDefinitions;
    if (field in ownerSettingDefinitions) {
      mapped[field] = ownerSettingDefinitions[field].allowed;
    }
  }
  return mapped;
}

export function serializeOwnerSettings(
  entries: Iterable<readonly [string, FormDataEntryValue]>,
  updatedAt: string,
): OwnerFormResult {
  const values = Array.from(entries);
  const keys = values.map(([key]) => key);
  const allowed = new Set<string>(OWNER_EDITABLE_KEYS);

  if (keys.some((key) => !allowed.has(key)) || new Set(keys).size !== keys.length) {
    return {
      success: false,
      errors: ["settings.unknown_key"],
      fieldErrors: {},
    };
  }
  if (
    keys.length !== OWNER_EDITABLE_KEYS.length ||
    OWNER_EDITABLE_KEYS.some((key) => !keys.includes(key))
  ) {
    return {
      success: false,
      errors: ["settings.missing_key"],
      fieldErrors: {},
    };
  }

  const formValues = new Map(values);
  const editable = Object.fromEntries(
    OWNER_EDITABLE_KEYS.map((key) => {
      const raw = formValues.get(key);
      if (typeof raw !== "string") return [key, raw];
      const normalized = raw.trim();
      if (nullableIntegerFields.has(key) && normalized === "") return [key, null];
      if (integerFields.has(key)) {
        return [key, /^\d+$/.test(normalized) ? Number(normalized) : Number.NaN];
      }
      if (monthDayFields.has(key)) {
        const calendarDate = /^\d{4}-(\d{2}-\d{2})$/.exec(normalized);
        return [key, calendarDate?.[1] ?? normalized];
      }
      return [key, raw];
    }),
  );

  const validation = validateOwnerSettings({
    schemaVersion: OWNER_SETTINGS_SCHEMA_VERSION,
    ...editable,
    updatedAt,
  });
  if (!validation.success) {
    return {
      success: false,
      errors: validation.errors,
      fieldErrors: mapOwnerSettingsErrors(validation.errors),
    };
  }
  return { success: true, data: validation.data };
}
