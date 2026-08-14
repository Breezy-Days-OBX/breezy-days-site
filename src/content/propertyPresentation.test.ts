import { describe, expect, it } from "vitest";

import { property } from "./property";

const modules = import.meta.glob("./propertyPresentation.ts", { eager: true });

type PresentationModule = {
  derivePublicPropertyFacts: (input: unknown) => {
    petsAllowed: boolean;
    location: string;
    proximity: string;
    rules: Array<{ label: string; value: string }>;
    monitoring: string;
  };
};

describe("public property presentation", () => {
  it("derives schema, proximity, rules, and monitoring copy from the property source", () => {
    const module = modules["./propertyPresentation.ts"] as PresentationModule | undefined;
    expect(module).toBeDefined();
    if (!module) return;
    const changed = {
      ...property,
      identity: { ...property.identity, location: "Test location" },
      access: { ...property.access, beach: "Alternate beach access", pier: "Alternate pier access" },
      pets: { ...property.pets, maximum: 0 },
      rules: {
        ...property.rules,
        childrenAllowed: false,
        eventsOrPartiesAllowed: true,
        smokingOrVapingInsideAllowed: true,
      },
      safety: {
        ...property.safety,
        monitoring: {
          exteriorCameras: true,
          doorbellCamera: false,
          noiseMonitoringDevices: true,
        },
      },
    };

    expect(module.derivePublicPropertyFacts(changed)).toEqual({
      petsAllowed: false,
      location: "Test location",
      proximity: "Alternate beach access. Alternate pier access.",
      rules: [
        { label: "Children", value: "Not allowed" },
        { label: "Events or parties", value: "Allowed" },
        { label: "Smoking or vaping inside", value: "Allowed" },
      ],
      monitoring: "Exterior cameras: present. Doorbell camera: not present. Noise-monitoring devices: present.",
    });
  });
});
