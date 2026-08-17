import { describe, expect, it } from "vitest";

const modules = import.meta.glob("./availabilityPrefill.ts", {
  eager: true,
});

type AvailabilityDraftField = "arrival" | "departure" | "guests";

interface AvailabilityPrefillModule {
  copyAvailabilityDraft(
    read: (field: AvailabilityDraftField) => string | null,
    write: (field: AvailabilityDraftField, value: string) => void,
  ): readonly AvailabilityDraftField[];
}

const getModule = () =>
  modules["./availabilityPrefill.ts"] as AvailabilityPrefillModule | undefined;

describe("availability prefill", () => {
  it("copies the complete hero draft into the full request", () => {
    const module = getModule();
    expect(module).toBeDefined();
    if (!module) return;

    const source = {
      arrival: "2035-06-10",
      departure: "2035-06-17",
      guests: "6",
    } as const;
    const written: Partial<Record<AvailabilityDraftField, string>> = {};

    const copied = module.copyAvailabilityDraft(
      (field) => source[field],
      (field, value) => {
        written[field] = value;
      },
    );

    expect(copied).toEqual(["arrival", "departure", "guests"]);
    expect(written).toEqual(source);
  });

  it("skips blank values instead of erasing a full-form field", () => {
    const module = getModule();
    if (!module) return;
    const source = { arrival: "", departure: " 2035-06-17 ", guests: "   " } as const;
    const written: Partial<Record<AvailabilityDraftField, string>> = {};

    const copied = module.copyAvailabilityDraft(
      (field) => source[field],
      (field, value) => {
        written[field] = value;
      },
    );

    expect(copied).toEqual(["departure"]);
    expect(written).toEqual({ departure: "2035-06-17" });
  });

  it("never reads or writes contact and pet fields", () => {
    const module = getModule();
    if (!module) return;
    const allowed = new Set(["arrival", "departure", "guests"]);
    const readFields: string[] = [];
    const writtenFields: string[] = [];

    module.copyAvailabilityDraft(
      (field) => {
        expect(allowed.has(field)).toBe(true);
        readFields.push(field);
        return "1";
      },
      (field) => {
        expect(allowed.has(field)).toBe(true);
        writtenFields.push(field);
      },
    );

    expect(readFields).toEqual(["arrival", "departure", "guests"]);
    expect(writtenFields).toEqual(["arrival", "departure", "guests"]);
    expect([...readFields, ...writtenFields]).not.toEqual(
      expect.arrayContaining(["pets", "name", "email", "phone"]),
    );
  });
});
