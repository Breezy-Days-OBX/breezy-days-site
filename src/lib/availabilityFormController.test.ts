import { describe, expect, it, vi } from "vitest";

const modules = import.meta.glob("./availabilityFormController.ts", {
  eager: true,
});

interface ErrorPresentation {
  field: string;
  message: string;
  href: string;
}

interface FormView {
  nativeValidationEnabled: boolean;
  submission: Record<string, unknown>;
  maximumPets: number;
  errors: ErrorPresentation[];
  summaryFocused: boolean;
  pending: boolean;
  nativeSubmits: number;
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

type FormControllerModule = {
  createAvailabilityFormController: (
    view: FormView,
    dependencies: {
      today: () => string;
      track: (name: string, category: string) => void;
      markSubmitted: () => void;
    },
  ) => {
    activate(): void;
    start(): void;
    submit(): "invalid" | "accepted" | "duplicate";
  };
};

const validSubmission = {
  arrival: "2026-08-15",
  departure: "2026-08-16",
  guests: 4,
  pets: 0,
  name: "Ada Lovelace",
  email: "ada@example.com",
  phone: "9197256797",
  message: "",
  acknowledgesRequestNotReservation: true,
  acknowledgesPrivacy: true,
};

const createView = (submission: Record<string, unknown> = validSubmission): FormView => ({
  nativeValidationEnabled: true,
  submission,
  maximumPets: 2,
  errors: [],
  summaryFocused: false,
  pending: false,
  nativeSubmits: 0,
  enableCustomValidation() {
    this.nativeValidationEnabled = false;
  },
  readSubmission() {
    return this.submission;
  },
  readMaximumPets() {
    return this.maximumPets;
  },
  resetValidation() {
    this.errors = [];
    this.summaryFocused = false;
  },
  fieldId(field) {
    return field === "form" ? null : `${field}-control`;
  },
  showErrors(errors) {
    this.errors = [...errors];
  },
  focusErrorSummary() {
    this.summaryFocused = true;
  },
  setPending() {
    this.pending = true;
  },
  submitNative() {
    this.nativeSubmits += 1;
  },
});

describe("availability form controller", () => {
  it("keeps native validation until custom behavior is fully activated", () => {
    const module = modules["./availabilityFormController.ts"] as FormControllerModule | undefined;
    expect(module).toBeDefined();
    if (!module) return;
    const view = createView();
    const controller = module.createAvailabilityFormController(view, {
      today: () => "2026-08-14",
      track: vi.fn(),
      markSubmitted: vi.fn(),
    });

    expect(view.nativeValidationEnabled).toBe(true);
    controller.activate();
    expect(view.nativeValidationEnabled).toBe(false);
  });

  it("links invalid fields from the summary and moves focus there", () => {
    const module = modules["./availabilityFormController.ts"] as FormControllerModule | undefined;
    if (!module) return;
    const view = createView({
      ...validSubmission,
      arrival: "",
      email: "broken",
    });
    const controller = module.createAvailabilityFormController(view, {
      today: () => "2026-08-14",
      track: vi.fn(),
      markSubmitted: vi.fn(),
    });
    controller.activate();

    expect(controller.submit()).toBe("invalid");
    expect(view.summaryFocused).toBe(true);
    expect(view.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "arrival", href: "#arrival-control" }),
        expect.objectContaining({ field: "email", href: "#email-control" }),
      ]),
    );
    expect(view.nativeSubmits).toBe(0);
  });

  it("enters pending state once and blocks duplicate native submits", () => {
    const module = modules["./availabilityFormController.ts"] as FormControllerModule | undefined;
    if (!module) return;
    const view = createView();
    const track = vi.fn();
    const markSubmitted = vi.fn();
    const controller = module.createAvailabilityFormController(view, {
      today: () => "2026-08-14",
      track,
      markSubmitted,
    });
    controller.activate();

    expect(controller.submit()).toBe("accepted");
    expect(controller.submit()).toBe("duplicate");
    expect(view.pending).toBe(true);
    expect(view.nativeSubmits).toBe(1);
    expect(markSubmitted).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith("form_submit", "availability_form");
  });

  it("validates against the accepted live pet maximum without exposing values to analytics", () => {
    const module = modules["./availabilityFormController.ts"] as FormControllerModule | undefined;
    if (!module) return;
    const view = createView({ ...validSubmission, pets: 4 });
    view.maximumPets = 4;
    const track = vi.fn();
    const controller = module.createAvailabilityFormController(view, {
      today: () => "2026-08-14",
      track,
      markSubmitted: vi.fn(),
    });
    controller.activate();

    expect(controller.submit()).toBe("accepted");
    expect(track).toHaveBeenCalledWith("form_submit", "availability_form");
    expect(JSON.stringify(track.mock.calls)).not.toMatch(/Ada|2026-08|9197256797|pets/i);
  });
});
