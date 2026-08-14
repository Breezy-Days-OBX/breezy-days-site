import marketplaceProof from "./marketplace-proof.json";

export const siteContent = {
  primaryAction: {
    label: "Check availability",
    href: "#availability",
  },
  booking: {
    mode: "request-to-book",
    disclaimer:
      "Checking your dates starts a request. The owner confirms availability, total price, and booking terms; submitting the form is not a reservation.",
  },
  homepageSections: [
    "hero",
    "availability",
    "fit",
    "home",
    "essentials",
    "reviews",
    "process",
    "location",
    "faq",
    "final-action",
  ],
  indexableRoutes: ["/", "/rental-information/", "/privacy/"],
  marketplaceProof,
} as const;
