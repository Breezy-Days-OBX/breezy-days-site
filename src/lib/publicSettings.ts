import { parsePublicOwnerSettings, type PublicOwnerSettings } from "./ownerSettings";

type PublicSettingKey = keyof Omit<PublicOwnerSettings, "updatedAt">;
type PublicDisplayKey =
  PublicSettingKey | "petPolicySummary" | "petPolicyDetails" | "petPolicyFormHint";

export interface PublicSettingsView {
  setText(key: PublicDisplayKey, value: string): void;
  setMaximumPets(maximum: number): void;
}

interface SettingsResponse {
  ok: boolean;
  json(): Promise<unknown>;
}

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const formatMonthDay = (value: string) => {
  const [month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2000, month - 1, day)));
};

export const formatPublicSettings = (
  settings: PublicOwnerSettings,
): Record<PublicDisplayKey, string> => {
  const petCount = `${settings.maxPets} ${settings.maxPets === 1 ? "pet" : "pets"}`;
  const petFee = money.format(settings.petFeeUsd);

  return {
    startingWeeklyRateUsd:
      settings.startingWeeklyRateUsd === null
        ? "Personalized quote for your dates"
        : `From ${money.format(settings.startingWeeklyRateUsd)} per week`,
    minimumStayNights:
      settings.minimumStayNights === null
        ? "Stay requirements vary by dates"
        : `${settings.minimumStayNights}-night minimum stay`,
    pricingNote: settings.pricingNote,
    poolHeatFeeUsd: `${money.format(settings.poolHeatFeeUsd)} per stay`,
    petFeeUsd: `${petFee} per stay`,
    maxPets: String(settings.maxPets),
    poolOpenMonthDay: formatMonthDay(settings.poolOpenMonthDay),
    poolCloseMonthDay: formatMonthDay(settings.poolCloseMonthDay),
    petPolicySummary: settings.maxPets === 0 ? "No pets" : `Up to ${petCount} · ${petFee} per stay`,
    petPolicyDetails:
      settings.maxPets === 0
        ? "Pets are not allowed"
        : `Up to ${petCount}; ${petFee} per stay for additional cleaning`,
    petPolicyFormHint:
      settings.maxPets === 0 ? "Pets are not allowed for this stay." : `Up to ${petCount}.`,
  };
};

export async function enhancePublicSettings(
  fetchSettings: () => Promise<SettingsResponse>,
  view: PublicSettingsView,
): Promise<boolean> {
  try {
    const response = await fetchSettings();
    if (!response.ok) return false;
    const settings = parsePublicOwnerSettings(await response.json());
    if (!settings) return false;

    const formatted = formatPublicSettings(settings);
    for (const key of Object.keys(formatted) as PublicDisplayKey[]) {
      view.setText(key, formatted[key]);
    }
    view.setMaximumPets(settings.maxPets);
    return true;
  } catch {
    return false;
  }
}
