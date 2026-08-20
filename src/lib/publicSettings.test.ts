import { describe, expect, it, vi } from "vitest";

import { ownerSettingsDefaults } from "./ownerSettings";

const modules = import.meta.glob("./publicSettings.ts", { eager: true });

type PublicSettingsModule = {
  formatPublicSettings?: (settings: Record<string, unknown>) => Record<string, string>;
  enhancePublicSettings: (
    fetchSettings: () => Promise<{ ok: boolean; json(): Promise<unknown> }>,
    view: {
      setText(key: string, value: string): void;
      setMaximumPets(maximum: number): void;
    },
  ) => Promise<boolean>;
};

const createView = () => {
  const state = {
    text: { pricingNote: "Static pricing", maxPets: "2" } as Record<string, string>,
    petOptions: [0, 1, 2],
  };
  return {
    state,
    setText(key: string, value: string) {
      state.text[key] = value;
    },
    setMaximumPets(maximum: number) {
      state.petOptions = Array.from({ length: maximum + 1 }, (_, index) => index);
    },
  };
};

describe("public settings enhancement", () => {
  it("formats an owner-friendly pet policy for allowed and pet-free stays", () => {
    const module = modules["./publicSettings.ts"] as PublicSettingsModule | undefined;
    expect(module?.formatPublicSettings).toBeTypeOf("function");
    if (!module?.formatPublicSettings) return;

    expect(
      module.formatPublicSettings({
        ...ownerSettingsDefaults,
        maxPets: 2,
        petFeeUsd: 150,
        updatedAt: "2026-08-14T15:00:00.000Z",
      }),
    ).toMatchObject({
      petPolicySummary: "Up to 2 pets · $150 per stay",
      petPolicyDetails: "Up to 2 pets; $150 per stay for additional cleaning",
      petPolicyFormHint: "Up to 2 pets.",
    });
    expect(
      module.formatPublicSettings({
        ...ownerSettingsDefaults,
        maxPets: 0,
        updatedAt: "2026-08-14T15:00:00.000Z",
      }),
    ).toMatchObject({
      petPolicySummary: "No pets",
      petPolicyDetails: "Pets are not allowed",
      petPolicyFormHint: "Pets are not allowed for this stay.",
    });
  });

  it.each([
    [
      "failed",
      async () => {
        throw new Error("offline");
      },
    ],
    [
      "partial",
      async () => ({
        ok: true,
        json: async () => ({ pricingNote: "Partial" }),
      }),
    ],
  ])(
    "preserves the complete static DOM after a %s settings read",
    async (_label, fetchSettings) => {
      const module = modules["./publicSettings.ts"] as PublicSettingsModule | undefined;
      expect(module).toBeDefined();
      if (!module) return;
      const view = createView();
      const before = structuredClone(view.state);

      expect(await module.enhancePublicSettings(fetchSettings, view)).toBe(false);
      expect(view.state).toEqual(before);
    },
  );

  it("updates marked text and pet choices together only after a complete sanitized response", async () => {
    const module = modules["./publicSettings.ts"] as PublicSettingsModule | undefined;
    if (!module) return;
    const view = createView();
    const fetchSettings = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        ...ownerSettingsDefaults,
        pricingNote: "Owner-approved live note.",
        maxPets: 4,
        updatedAt: "2026-08-14T15:00:00.000Z",
      }),
    }));

    expect(await module.enhancePublicSettings(fetchSettings, view)).toBe(true);
    expect(view.state.text.pricingNote).toBe("Owner-approved live note.");
    expect(view.state.text.maxPets).toBe("4");
    expect(view.state.petOptions).toEqual([0, 1, 2, 3, 4]);
  });
});
