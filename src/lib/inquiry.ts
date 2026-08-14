import { property } from "../content/property";
import { getDateRangeError, isValidIsoDate, toLocalIsoDate } from "./dateRules";

export const inquiryErrorCategories = [
  "invalid_type",
  "invalid_date",
  "not_future",
  "not_after_arrival",
  "out_of_range",
  "invalid_length",
  "invalid_email",
  "invalid_phone",
  "too_long",
  "acknowledgement_required",
  "unknown_field",
] as const;

export type InquiryErrorCategory = (typeof inquiryErrorCategories)[number];
export type InquiryField =
  | "arrival"
  | "departure"
  | "guests"
  | "pets"
  | "name"
  | "email"
  | "phone"
  | "message"
  | "acknowledgesRequestNotReservation"
  | "acknowledgesPrivacy";

export interface Inquiry {
  arrival: string;
  departure: string;
  guests: number;
  pets: number;
  name: string;
  email: string;
  phone: string;
  message?: string;
  acknowledgesRequestNotReservation: true;
  acknowledgesPrivacy: true;
}

export interface InquiryError {
  field: InquiryField | "form";
  category: InquiryErrorCategory;
}

export type InquiryValidationResult =
  | { success: true; data: Inquiry }
  | { success: false; errors: readonly InquiryError[] };

const inquiryFields = new Set<InquiryField>([
  "arrival",
  "departure",
  "guests",
  "pets",
  "name",
  "email",
  "phone",
  "message",
  "acknowledgesRequestNotReservation",
  "acknowledgesPrivacy",
]);

const practicalEmail =
  /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;
const dialablePhone = /^[+().\-\s\d]+$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function validateInquiry(
  input: unknown,
  options: { today?: string } = {},
): InquiryValidationResult {
  if (!isRecord(input)) {
    return { success: false, errors: [{ field: "form", category: "invalid_type" }] };
  }

  const errors: InquiryError[] = [];
  const today = options.today ?? toLocalIsoDate(new Date());

  if (Object.keys(input).some((key) => !inquiryFields.has(key as InquiryField))) {
    errors.push({ field: "form", category: "unknown_field" });
  }

  const arrival = typeof input.arrival === "string" ? input.arrival : null;
  const arrivalValid = arrival !== null && isValidIsoDate(arrival);
  if (!arrivalValid) {
    errors.push({ field: "arrival", category: "invalid_date" });
  } else if (getDateRangeError(today, arrival)) {
    errors.push({ field: "arrival", category: "not_future" });
  }

  const departure = typeof input.departure === "string" ? input.departure : null;
  const departureValid = departure !== null && isValidIsoDate(departure);
  if (!departureValid) {
    errors.push({ field: "departure", category: "invalid_date" });
  } else if (arrivalValid && getDateRangeError(arrival, departure)) {
    errors.push({ field: "departure", category: "not_after_arrival" });
  }

  if (!Number.isInteger(input.guests)) {
    errors.push({ field: "guests", category: "invalid_type" });
  } else if (
    Number(input.guests) < 1 ||
    Number(input.guests) > property.fit.maximumOvernightGuests
  ) {
    errors.push({ field: "guests", category: "out_of_range" });
  }

  if (!Number.isInteger(input.pets)) {
    errors.push({ field: "pets", category: "invalid_type" });
  } else if (Number(input.pets) < 0 || Number(input.pets) > property.pets.maximum) {
    errors.push({ field: "pets", category: "out_of_range" });
  }

  const name = typeof input.name === "string" ? input.name.trim() : null;
  if (name === null) {
    errors.push({ field: "name", category: "invalid_type" });
  } else if (name.length < 2 || name.length > 80) {
    errors.push({ field: "name", category: "invalid_length" });
  }

  const email = typeof input.email === "string" ? input.email.trim() : null;
  if (email === null) {
    errors.push({ field: "email", category: "invalid_type" });
  } else if (!practicalEmail.test(email)) {
    errors.push({ field: "email", category: "invalid_email" });
  }

  const phone = typeof input.phone === "string" ? input.phone.trim() : null;
  if (phone === null) {
    errors.push({ field: "phone", category: "invalid_type" });
  } else {
    const digitCount = phone.replace(/\D/g, "").length;
    if (phone.length < 7 || phone.length > 20 || digitCount < 7 || !dialablePhone.test(phone)) {
      errors.push({ field: "phone", category: "invalid_phone" });
    }
  }

  const message = input.message === undefined ? undefined : input.message;
  if (message !== undefined && typeof message !== "string") {
    errors.push({ field: "message", category: "invalid_type" });
  } else if (typeof message === "string" && message.length > 500) {
    errors.push({ field: "message", category: "too_long" });
  }

  if (input.acknowledgesRequestNotReservation !== true) {
    errors.push({
      field: "acknowledgesRequestNotReservation",
      category: "acknowledgement_required",
    });
  }
  if (input.acknowledgesPrivacy !== true) {
    errors.push({ field: "acknowledgesPrivacy", category: "acknowledgement_required" });
  }

  if (errors.length > 0) return { success: false, errors };

  return {
    success: true,
    data: {
      arrival: arrival as string,
      departure: departure as string,
      guests: input.guests as number,
      pets: input.pets as number,
      name: name as string,
      email: email as string,
      phone: phone as string,
      ...(typeof message === "string" ? { message } : {}),
      acknowledgesRequestNotReservation: true,
      acknowledgesPrivacy: true,
    },
  };
}
