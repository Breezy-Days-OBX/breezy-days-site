import { describe, expect, it } from "vitest";

import { validateInquiry } from "./inquiry";

const today = "2026-08-14";
const validInquiry = {
  arrival: "2026-08-15",
  departure: "2026-08-16",
  guests: 1,
  pets: 0,
  name: "Ada Lovelace",
  email: "ada.lovelace+obx@example.co.uk",
  phone: "+1 (919) 725-6797",
  message: "We are planning a family beach week.",
  acknowledgesRequestNotReservation: true,
  acknowledgesPrivacy: true,
};

const categories = (result: ReturnType<typeof validateInquiry>) =>
  result.success ? [] : result.errors.map((error) => `${error.field}:${error.category}`);

describe("minimum inquiry contract", () => {
  it("accepts the inclusive guest, pet, name, phone, and message boundaries", () => {
    expect(validateInquiry({
      ...validInquiry,
      guests: 1,
      pets: 0,
      name: "Al",
      phone: "1234567",
      message: "",
    }, { today }).success).toBe(true);
    expect(validateInquiry({
      ...validInquiry,
      guests: 10,
      pets: 2,
      name: "N".repeat(80),
      phone: "1".repeat(20),
      message: "M".repeat(500),
    }, { today }).success).toBe(true);
  });

  it.each([
    ["guests", 0, "guests:out_of_range"],
    ["guests", 11, "guests:out_of_range"],
    ["pets", -1, "pets:out_of_range"],
    ["pets", 3, "pets:out_of_range"],
  ])("rejects %s outside its allowed range", (field, value, expected) => {
    expect(categories(validateInquiry({ ...validInquiry, [field]: value }, { today }))).toContain(expected);
  });

  it("rejects non-integer guest and pet counts", () => {
    expect(categories(validateInquiry({ ...validInquiry, guests: 2.5 }, { today }))).toContain("guests:invalid_type");
    expect(categories(validateInquiry({ ...validInquiry, pets: "1" }, { today }))).toContain("pets:invalid_type");
  });

  it("uses an accepted sanitized maximum-pet setting when one is supplied", () => {
    expect(validateInquiry({ ...validInquiry, pets: 4 }, { today, maximumPets: 4 }).success).toBe(true);
    expect(categories(validateInquiry({ ...validInquiry, pets: 5 }, { today, maximumPets: 4 }))).toContain(
      "pets:out_of_range",
    );
    expect(categories(validateInquiry({ ...validInquiry, pets: 1 }, { today, maximumPets: 0 }))).toContain(
      "pets:out_of_range",
    );
  });

  it("requires a real future arrival and a later departure", () => {
    expect(categories(validateInquiry({ ...validInquiry, arrival: today }, { today }))).toContain("arrival:not_future");
    expect(categories(validateInquiry({ ...validInquiry, arrival: "2026-08-13" }, { today }))).toContain("arrival:not_future");
    expect(categories(validateInquiry({ ...validInquiry, arrival: "2026-02-30" }, { today }))).toContain("arrival:invalid_date");
    expect(categories(validateInquiry({ ...validInquiry, departure: validInquiry.arrival }, { today }))).toContain("departure:not_after_arrival");
    expect(categories(validateInquiry({ ...validInquiry, departure: "2026-08-14" }, { today }))).toContain("departure:not_after_arrival");
    expect(categories(validateInquiry({ ...validInquiry, departure: "08/20/2026" }, { today }))).toContain("departure:invalid_date");
  });

  it("enforces trimmed name boundaries", () => {
    expect(categories(validateInquiry({ ...validInquiry, name: " A " }, { today }))).toContain("name:invalid_length");
    expect(categories(validateInquiry({ ...validInquiry, name: ` ${"N".repeat(81)} ` }, { today }))).toContain("name:invalid_length");
    expect(categories(validateInquiry({ ...validInquiry, name: 123 }, { today }))).toContain("name:invalid_type");
  });

  it("accepts practical RFC-compatible email and rejects malformed addresses", () => {
    expect(validateInquiry(validInquiry, { today }).success).toBe(true);
    for (const email of [
      "guest",
      "guest@",
      "guest@example",
      "guest name@example.com",
      "guest@-example.com",
      ".guest@example.com",
      "guest.@example.com",
      "guest..name@example.com",
    ]) {
      expect(categories(validateInquiry({ ...validInquiry, email }, { today })), email).toContain("email:invalid_email");
    }
  });

  it("enforces the RFC local-part and practical total-address length boundaries", () => {
    const local64 = "l".repeat(64);
    const domainAt254Total = `${"a".repeat(63)}.${"b".repeat(63)}.${"c".repeat(61)}`;
    const domainAt255Total = `${"a".repeat(63)}.${"b".repeat(63)}.${"c".repeat(62)}`;

    expect(validateInquiry({ ...validInquiry, email: `${local64}@example.com` }, { today }).success).toBe(true);
    expect(categories(validateInquiry({ ...validInquiry, email: `${"l".repeat(65)}@example.com` }, { today }))).toContain(
      "email:invalid_email",
    );
    expect(validateInquiry({ ...validInquiry, email: `${local64}@${domainAt254Total}` }, { today }).success).toBe(true);
    expect(categories(validateInquiry({ ...validInquiry, email: `${local64}@${domainAt255Total}` }, { today }))).toContain(
      "email:invalid_email",
    );
  });

  it("requires 7-20 allowed phone characters with at least seven digits", () => {
    for (const phone of ["123456", "1".repeat(21), "919-CALL", "+++++++"]) {
      expect(categories(validateInquiry({ ...validInquiry, phone }, { today })), phone).toContain("phone:invalid_phone");
    }
  });

  it("allows an omitted message and rejects non-text or overlong messages", () => {
    const { message: _message, ...withoutMessage } = validInquiry;
    expect(validateInquiry(withoutMessage, { today }).success).toBe(true);
    expect(categories(validateInquiry({ ...validInquiry, message: 12 }, { today }))).toContain("message:invalid_type");
    expect(categories(validateInquiry({ ...validInquiry, message: "M".repeat(501) }, { today }))).toContain("message:too_long");
  });

  it("requires both explicit acknowledgements", () => {
    expect(categories(validateInquiry({ ...validInquiry, acknowledgesRequestNotReservation: false }, { today }))).toContain(
      "acknowledgesRequestNotReservation:acknowledgement_required",
    );
    expect(categories(validateInquiry({ ...validInquiry, acknowledgesPrivacy: false }, { today }))).toContain(
      "acknowledgesPrivacy:acknowledgement_required",
    );
  });

  it("rejects fields outside the minimum contract", () => {
    expect(categories(validateInquiry({ ...validInquiry, cardNumber: "4111111111111111" }, { today }))).toContain(
      "form:unknown_field",
    );
  });

  it("returns fixed analytics-safe errors without echoing submitted values", () => {
    const secret = "do-not-echo-this-value";
    const result = validateInquiry({ ...validInquiry, name: secret.repeat(10), email: secret }, { today });

    expect(result.success).toBe(false);
    expect(JSON.stringify(result)).not.toContain(secret);
  });
});
