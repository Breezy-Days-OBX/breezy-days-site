export const publicAnalyticsEvents = [
  "primary_request_click",
  "form_start",
  "form_validation_error",
  "form_submit",
  "form_success",
  "marketplace_outbound_click",
] as const;

export const publicAnalyticsCategories = [
  "header",
  "hero",
  "availability_form",
  "inline",
  "final_action",
  "mobile_action",
  "marketplace_airbnb",
  "marketplace_vrbo",
] as const;

export type PublicAnalyticsEvent = (typeof publicAnalyticsEvents)[number];
export type PublicAnalyticsCategory = (typeof publicAnalyticsCategories)[number];

const eventNames = new Set<unknown>(publicAnalyticsEvents);
const eventCategories = new Set<unknown>(publicAnalyticsCategories);

export function createPublicAnalyticsEvent(
  name: unknown,
  category: unknown,
  pathname: string,
): { name: PublicAnalyticsEvent; category: PublicAnalyticsCategory } | null {
  if (pathname === "/owner" || pathname.startsWith("/owner/")) return null;
  if (!eventNames.has(name) || !eventCategories.has(category)) return null;

  return {
    name: name as PublicAnalyticsEvent,
    category: category as PublicAnalyticsCategory,
  };
}

export function trackPublicEvent(
  name: unknown,
  category: unknown,
  pathname = typeof window === "undefined" ? "" : window.location.pathname,
) {
  const event = createPublicAnalyticsEvent(name, category, pathname);
  if (!event || typeof window === "undefined") return;

  const analyticsWindow = window as Window & {
    gtag?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
  };
  analyticsWindow.gtag?.("event", event.name, { event_category: event.category });
  analyticsWindow.clarity?.("event", event.name);
}
