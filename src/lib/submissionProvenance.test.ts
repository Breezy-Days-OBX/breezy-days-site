import { describe, expect, it, vi } from "vitest";

const modules = import.meta.glob("./submissionProvenance.ts", { eager: true });

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

type ProvenanceModule = {
  markAvailabilitySubmitted(storage: StorageLike): void;
  trackFormSuccessIfSubmitted(
    storage: StorageLike,
    track: (name: string, category: string) => void,
  ): boolean;
};

const createStorage = (): StorageLike => {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
};

describe("form-success submission provenance", () => {
  it("does not emit on direct or refreshed thank-you visits", () => {
    const module = modules["./submissionProvenance.ts"] as ProvenanceModule | undefined;
    expect(module).toBeDefined();
    if (!module) return;
    const storage = createStorage();
    const track = vi.fn();

    expect(module.trackFormSuccessIfSubmitted(storage, track)).toBe(false);
    module.markAvailabilitySubmitted(storage);
    expect(module.trackFormSuccessIfSubmitted(storage, track)).toBe(true);
    expect(module.trackFormSuccessIfSubmitted(storage, track)).toBe(false);
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith("form_success", "availability_form");
  });

  it("stores only a fixed non-PII flag", () => {
    const module = modules["./submissionProvenance.ts"] as ProvenanceModule | undefined;
    if (!module) return;
    const writes: Array<[string, string]> = [];
    const storage: StorageLike = {
      getItem: () => null,
      setItem: (key, value) => writes.push([key, value]),
      removeItem: () => undefined,
    };

    module.markAvailabilitySubmitted(storage);

    expect(writes).toHaveLength(1);
    expect(JSON.stringify(writes)).not.toMatch(/email|phone|arrival|departure|message|2026/i);
  });
});
