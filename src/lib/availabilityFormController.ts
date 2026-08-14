import { validateInquiry } from "./inquiry";

export interface ErrorPresentation {
  field: string;
  message: string;
  href: string;
}

export interface AvailabilityFormView {
  enableCustomValidation(): void;
  readSubmission(): unknown;
  readMaximumPets(): number;
  resetValidation(): void;
  fieldId(field: string): string | null;
  showErrors(errors: readonly ErrorPresentation[]): void;
  focusErrorSummary(): void;
  setPending(): void;
  submitNative(): void;
}

interface Dependencies {
  today(): string;
  track(name: string, category: string): void;
  markSubmitted(): void;
}

const errorMessages: Record<string, string> = {
  "arrival.invalid_date": "Enter a valid arrival date.",
  "arrival.not_future": "Choose an arrival date after today.",
  "departure.invalid_date": "Enter a valid departure date.",
  "departure.not_after_arrival": "Choose a departure date after arrival.",
  "guests.invalid_type": "Enter the number of overnight guests.",
  "guests.out_of_range": "Enter a guest count within the home’s overnight capacity.",
  "pets.invalid_type": "Select the number of pets.",
  "pets.out_of_range": "Select a pet count within the current pet limit.",
  "name.invalid_type": "Enter your name.",
  "name.invalid_length": "Enter a name between 2 and 80 characters.",
  "email.invalid_type": "Enter your email address.",
  "email.invalid_email": "Enter a complete email address.",
  "phone.invalid_type": "Enter your phone number.",
  "phone.invalid_phone": "Enter a phone number with at least 7 digits.",
  "message.invalid_type": "Enter a plain-text message.",
  "message.too_long": "Keep your message to 500 characters or fewer.",
  "acknowledgesRequestNotReservation.acknowledgement_required":
    "Confirm that this is a request, not a reservation or guaranteed price.",
  "acknowledgesPrivacy.acknowledgement_required":
    "Confirm that we may use these details to review and reply.",
};

export function createAvailabilityFormController(
  view: AvailabilityFormView,
  dependencies: Dependencies,
) {
  let started = false;
  let pending = false;

  return {
    activate() {
      view.enableCustomValidation();
    },
    start() {
      if (started) return;
      started = true;
      dependencies.track("form_start", "availability_form");
    },
    submit(): "invalid" | "accepted" | "duplicate" {
      if (pending) return "duplicate";
      view.resetValidation();
      const validation = validateInquiry(view.readSubmission(), {
        today: dependencies.today(),
        maximumPets: view.readMaximumPets(),
      });

      if (!validation.success) {
        const seenFields = new Set<string>();
        const errors: ErrorPresentation[] = [];
        for (const error of validation.errors) {
          if (seenFields.has(error.field)) continue;
          seenFields.add(error.field);
          const fieldId = view.fieldId(error.field);
          errors.push({
            field: error.field,
            message: errorMessages[`${error.field}.${error.category}`] ?? "Review this field.",
            href: fieldId ? `#${fieldId}` : "#availability",
          });
        }
        view.showErrors(errors);
        dependencies.track("form_validation_error", "availability_form");
        view.focusErrorSummary();
        return "invalid";
      }

      pending = true;
      view.setPending();
      dependencies.markSubmitted();
      dependencies.track("form_submit", "availability_form");
      view.submitNative();
      return "accepted";
    },
  };
}
