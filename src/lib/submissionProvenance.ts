interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const submissionKey = "breezy_days_request_submitted";
const submissionMarker = "accepted";

export function markAvailabilitySubmitted(storage: StorageLike): void {
  try {
    storage.setItem(submissionKey, submissionMarker);
  } catch {
    // Storage availability must never prevent the request itself.
  }
}

export function trackFormSuccessIfSubmitted(
  storage: StorageLike,
  track: (name: string, category: string) => void,
): boolean {
  try {
    if (storage.getItem(submissionKey) !== submissionMarker) return false;
    storage.removeItem(submissionKey);
  } catch {
    return false;
  }

  track("form_success", "availability_form");
  return true;
}
