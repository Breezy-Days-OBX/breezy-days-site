interface PropertyFactsSource {
  identity: { location: string };
  access: { beach: string; pier: string };
  pets: { maximum: number };
  rules: {
    childrenAllowed: boolean;
    eventsOrPartiesAllowed: boolean;
    smokingOrVapingInsideAllowed: boolean;
  };
  safety: {
    monitoring: {
      exteriorCameras: boolean;
      doorbellCamera: boolean;
      noiseMonitoringDevices: boolean;
    };
  };
}

const sentence = (value: string) => `${value.replace(/[.\s]+$/, "")}.`;
const allowed = (value: boolean) => value ? "Allowed" : "Not allowed";
const present = (value: boolean) => value ? "present" : "not present";

export function derivePublicPropertyFacts(property: PropertyFactsSource) {
  return {
    petsAllowed: property.pets.maximum > 0,
    location: property.identity.location,
    proximity: `${sentence(property.access.beach)} ${sentence(property.access.pier)}`,
    rules: [
      { label: "Children", value: allowed(property.rules.childrenAllowed) },
      { label: "Events or parties", value: allowed(property.rules.eventsOrPartiesAllowed) },
      {
        label: "Smoking or vaping inside",
        value: allowed(property.rules.smokingOrVapingInsideAllowed),
      },
    ],
    monitoring:
      `Exterior cameras: ${present(property.safety.monitoring.exteriorCameras)}. ` +
      `Doorbell camera: ${present(property.safety.monitoring.doorbellCamera)}. ` +
      `Noise-monitoring devices: ${present(property.safety.monitoring.noiseMonitoringDevices)}.`,
  };
}
