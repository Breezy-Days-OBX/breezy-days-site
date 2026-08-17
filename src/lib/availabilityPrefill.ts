export const AVAILABILITY_DRAFT_FIELDS = ["arrival", "departure", "guests"] as const;

export type AvailabilityDraftField = (typeof AVAILABILITY_DRAFT_FIELDS)[number];
export type AvailabilityDraftReader = (field: AvailabilityDraftField) => string | null;
export type AvailabilityDraftWriter = (field: AvailabilityDraftField, value: string) => void;

export function copyAvailabilityDraft(
  read: AvailabilityDraftReader,
  write: AvailabilityDraftWriter,
): readonly AvailabilityDraftField[] {
  const copied: AvailabilityDraftField[] = [];

  for (const field of AVAILABILITY_DRAFT_FIELDS) {
    const value = read(field)?.trim();
    if (!value) continue;
    write(field, value);
    copied.push(field);
  }

  return copied;
}
