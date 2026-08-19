import { describe, expect, it } from "vitest";

import { property } from "./property";

describe("approved property facts", () => {
  it("represents the approved identity, fit, capacity, and sleeping layout", () => {
    expect(property.identity).toEqual({
      publicName: "Breezy Days OBX",
      email: "breezydaysobx@gmail.com",
      location: "Rodanthe, North Carolina, on Hatteras Island in the Outer Banks",
      propertyType: "Entire home",
      hostLine: "Hosted by Danny & Michelle Day",
      businessPhone: "919-725-6797",
    });
    expect(property.fit).toEqual({
      bestFor: "Multi-generational families and family groups sharing a beach week",
      primaryPromise:
        "Ocean and sound views, beach access a few steps away, a private pool and hot tub, and four bedrooms for a family group",
      maximumOvernightGuests: 10,
    });
    expect(property.sleeping).toEqual({
      bedroomCount: 4,
      bedCount: 7,
      rooms: [
        {
          name: "First-floor primary bedroom",
          beds: [{ size: "king", count: 1 }],
        },
        {
          name: "First-floor bunk bedroom",
          beds: [{ size: "twin bunk", count: 4 }],
        },
        {
          name: "First-floor queen bedroom",
          beds: [{ size: "queen", count: 1 }],
        },
        {
          name: "Second-floor primary bedroom",
          beds: [{ size: "king", count: 1 }],
        },
      ],
    });
  });

  it("represents the approved access, facilities, and supplied/not-supplied amenities", () => {
    expect(property.bathrooms).toEqual({ full: 2, half: 1 });
    expect(property.access).toEqual({
      parkingVehicles: 4,
      entry:
        "The house is elevated on posts, and a full flight of stairs is required to reach the front door",
      beach: "Shared access a few steps from the Atlantic Ocean",
      pier: "The home is next to the historic pier, and pier passes are included with the stay",
    });
    expect(property.amenities.provided).toEqual([
      "Full kitchen",
      "Wi-Fi",
      "Washer",
      "Dryer",
      "Laundry detergent",
      "Linens",
      "Bath towels",
      "Beach chairs",
      "Dish soap",
      "Dishwasher soap",
      "Toilet tissue",
      "Paper towels",
      "Trash bags",
      "Hand soap",
      "Pier passes",
    ]);
    expect(property.amenities.notProvided).toEqual([
      "Beach/pool towels",
      "Beach cart",
      "Beach umbrella",
    ]);
    expect(property.amenities.localRentalNote).toBe(
      "Beach-rental agencies on the island offer beach equipment",
    );
    expect(property.outdoor).toEqual({
      poolAreaFacilities: ["Outdoor shower", "Changing room"],
      spacesAndViews: ["Multiple decks", "Ship's watch", "Ocean views", "Sound-side sunset views"],
      fishCleaningTable: true,
    });
    expect(property.entertainment).toEqual({
      televisions: "Smart TVs, 40 inches or larger, in all rooms",
      streaming: "Guest sign-in to streaming services",
      video: "DVD players and a DVD collection",
      other: ["Puzzles", "Games", "Books"],
    });
  });

  it("represents the approved pool, hot-tub, pet, arrival, rule, and safety facts", () => {
    expect(property.pool).toEqual({
      private: true,
      openMonthDay: "04-15",
      closeMonthDay: "10-15",
      heatFeeUsd: 250,
      heatNoticeHours: 48,
      heatFeeBasis: "per stay",
    });
    expect(property.hotTub).toEqual({
      private: true,
      available: "year-round",
      capacity: 7,
    });
    expect(property.pets).toEqual({
      maximum: 2,
      feeUsd: 150,
      feeBasis: "per stay",
      feePurpose: "additional cleaning",
    });
    expect(property.arrival).toEqual({
      checkIn: "After 4:00 PM",
      checkout: "Before 10:00 AM",
    });
    expect(property.rules).toEqual({
      primaryRenterMinimumAge: 24,
      childrenAllowed: true,
      eventsOrPartiesAllowed: false,
      smokingOrVapingInsideAllowed: false,
      currentVrboSmokingFineUsd: 500,
    });
    expect(property.safety).toEqual({
      postedRules: "Pool and hot-tub rules are posted at the property",
      equipment: ["Working smoke alarms", "Carbon monoxide alarms", "Fire extinguisher"],
      monitoring: {
        exteriorCameras: false,
        doorbellCamera: false,
        noiseMonitoringDevices: false,
      },
    });
  });

  it("represents the approved request, payment, weather, and owner-story handoff", () => {
    expect(property.booking).toEqual({
      model: "request-to-book",
      instantBookingOffered: false,
      availabilitySource:
        "Airbnb and Vrbo currently sync; no separate master calendar is maintained",
      guestRequest: "Share your dates, group size, and pet information",
      ownerReview:
        "Michelle and Danny check availability, make sure the home fits your group, and confirm the total price",
      confirmation:
        "If the request is approved, the owners send the rental agreement and payment instructions",
      reservationStatus: "An inquiry is not a confirmed reservation",
      preferredContactAfterInquiry: "Email",
      guestExpectation:
        "Michelle and Danny confirm availability, price, the rental agreement, and payment steps before the booking is complete",
      pricingMethod: "Rates are adjusted manually in response to booking demand",
    });
    expect(property.payment).toEqual({
      initialDepositUsd: 1000,
      remainingBalanceDueDaysBeforeCheckIn: 45,
      additionalFeesDueDaysBeforeCheckIn: 45,
      acceptedMethods: ["Check", "Cash App", "Venmo", "Credit card", "Zelle"],
    });
    expect(property.weather).toEqual({
      travelInsurance: "Encouraged because weather can affect island access",
      interruptionRefunds: "No refunds",
    });
    expect(property.ownerStory).toBe(
      "Michelle and Danny Day are the owners and hosts of Breezy Days. They were drawn to Rodanthe by the ocean, the sound, and the slower pace. Breezy Days gives families one place to stay together. With four bedrooms, a private pool and hot tub, beach access a few steps away, and Rodanthe Pier next door, several generations can share the same week without giving up their own space.",
    );
  });
});
