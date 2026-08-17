export const property = {
  identity: {
    publicName: "Breezy Days OBX",
    email: "breezydaysobx@gmail.com",
    location: "Rodanthe, North Carolina, on Hatteras Island in the Outer Banks",
    propertyType: "Entire home",
    hostLine: "Hosted by Danny & Michelle Day",
    businessPhone: "919-725-6797",
  },
  fit: {
    bestFor: "Multi-generational families and family groups sharing a beach week",
    primaryPromise:
      "Ocean and sound views, close beach access, a private pool, a private hot tub, and room for a family group",
    maximumOvernightGuests: 10,
  },
  sleeping: {
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
  },
  bathrooms: {
    full: 2,
    half: 1,
  },
  access: {
    parkingVehicles: 4,
    entry:
      "The house is elevated on posts, and a full flight of stairs is required to reach the front door",
    beach: "Shared access a few steps from the Atlantic Ocean",
    pier: "The home is next to the historic pier, and pier passes are included with the stay",
  },
  amenities: {
    provided: [
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
    ],
    notProvided: ["Beach/pool towels", "Beach cart", "Beach umbrella"],
    localRentalNote: "Beach-rental agencies on the island offer beach equipment",
  },
  outdoor: {
    poolAreaFacilities: ["Outdoor shower", "Changing room"],
    spacesAndViews: ["Multiple decks", "Ship's watch", "Ocean views", "Sound-side sunset views"],
    fishCleaningTable: true,
  },
  entertainment: {
    televisions: "Smart TVs, 40 inches or larger, in all rooms",
    streaming: "Guest sign-in to streaming services",
    video: "DVD players and a DVD collection",
    other: ["Puzzles", "Games", "Books"],
  },
  pool: {
    private: true,
    openMonthDay: "04-15",
    closeMonthDay: "10-15",
    heatFeeUsd: 250,
    heatNoticeHours: 48,
    heatFeeBasis: "per stay",
  },
  hotTub: {
    private: true,
    available: "year-round",
    capacity: 7,
  },
  pets: {
    maximum: 2,
    feeUsd: 150,
    feeBasis: "per stay",
    feePurpose: "additional cleaning",
  },
  arrival: {
    checkIn: "After 4:00 PM",
    checkout: "Before 10:00 AM",
  },
  rules: {
    primaryRenterMinimumAge: 24,
    childrenAllowed: true,
    eventsOrPartiesAllowed: false,
    smokingOrVapingInsideAllowed: false,
    currentVrboSmokingFineUsd: 500,
  },
  safety: {
    postedRules: "Pool and hot-tub rules are posted at the property",
    equipment: ["Working smoke alarms", "Carbon monoxide alarms", "Fire extinguisher"],
    monitoring: {
      exteriorCameras: false,
      doorbellCamera: false,
      noiseMonitoringDevices: false,
    },
  },
  booking: {
    model: "request-to-book",
    instantBookingOffered: false,
    availabilitySource: "Airbnb and Vrbo currently sync; no separate master calendar is maintained",
    guestRequest: "Guest submits dates and party information",
    ownerReview: "Dates, guest fit, availability, and final pricing are verified before approval",
    confirmation: "After approval, the owner sends the agreement and payment instructions",
    reservationStatus: "An inquiry is not a confirmed reservation",
    preferredContactAfterInquiry: "Email",
    guestExpectation:
      "The owner reviews the request before confirming availability, price, agreement, and payment steps",
    pricingMethod: "Rates are adjusted manually in response to booking demand",
  },
  payment: {
    initialDepositUsd: 1_000,
    remainingBalanceDueDaysBeforeCheckIn: 45,
    additionalFeesDueDaysBeforeCheckIn: 45,
    acceptedMethods: ["Check", "Cash App", "Venmo", "Credit card", "Zelle"],
  },
  weather: {
    travelInsurance: "Encouraged because weather can affect island access",
    interruptionRefunds: "No refunds",
  },
  ownerStory:
    "At Breezy Days, the house is the heart of the trip—not just a place to sleep between outings. The whole family can stay under one roof, with the Atlantic just a few steps away and sound-side sunsets waiting at day's end. Michelle and Danny were drawn to Rodanthe for that quieter, ocean-to-sound rhythm. With room for several generations, a private pool and hot tub, and the historic Rodanthe Pier next door, Breezy Days gives families an easy place to settle in and actually spend the week together.",
} as const;

export type Property = typeof property;
