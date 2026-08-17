const asRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};

const isRequiredString = (value) => typeof value === "string" && value.trim().length > 0;

export const isMarketplaceProofDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

export const isMarketplaceLink = (value) => {
  if (!isRequiredString(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
};

const hasRating = (marketplace) =>
  isRequiredString(marketplace.rating) &&
  Number.isInteger(marketplace.reviewCount) &&
  marketplace.reviewCount > 0;

export function inspectMarketplaceProof(value) {
  const proof = asRecord(value);
  const airbnb = asRecord(proof.airbnb);
  const vrbo = asRecord(proof.vrbo);
  const quote = asRecord(proof.quote);
  const issues = [];

  if (!isMarketplaceProofDate(proof.checkedOn)) issues.push("checked_on");
  if (proof.requiresLaunchReverification !== false) issues.push("reverification");
  if (!hasRating(airbnb)) issues.push("airbnb_rating");
  if (!isMarketplaceLink(airbnb.link)) issues.push("airbnb_link");
  if (!hasRating(vrbo)) issues.push("vrbo_rating");
  if (!isMarketplaceLink(vrbo.link)) issues.push("vrbo_link");
  if (!isRequiredString(quote.text) || !isRequiredString(quote.source)) issues.push("quote");
  if (quote.permission !== "approved") issues.push("quote_permission");

  return { proof, airbnb, vrbo, quote, issues };
}

export const formatMarketplaceProofDate = (checkedOn) =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${checkedOn}T00:00:00.000Z`));

export function getMarketplaceProofPresentation(value) {
  const inspected = inspectMarketplaceProof(value);
  const blockingIssues = new Set([
    "checked_on",
    "reverification",
    "airbnb_rating",
    "airbnb_link",
    "vrbo_rating",
    "vrbo_link",
    "quote",
    "quote_permission",
  ]);
  if (inspected.issues.some((issue) => blockingIssues.has(issue))) return null;

  return {
    checkedOnDisplay: formatMarketplaceProofDate(inspected.proof.checkedOn),
    airbnb: {
      rating: inspected.airbnb.rating,
      label: isRequiredString(inspected.airbnb.label) ? inspected.airbnb.label : null,
      reviewCount: inspected.airbnb.reviewCount,
      link: inspected.airbnb.link,
    },
    vrbo: {
      rating: inspected.vrbo.rating,
      reviewCount: inspected.vrbo.reviewCount,
      link: inspected.vrbo.link,
    },
    quote: { text: inspected.quote.text, source: inspected.quote.source },
  };
}
