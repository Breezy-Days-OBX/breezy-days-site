import type { OwnerApiErrorKind } from "./ownerApi";

type DashboardFailure = OwnerApiErrorKind | "service";
type Transition = (state: string) => void;

const failureState = (error: unknown): DashboardFailure => {
  if (typeof error === "object" && error !== null && "kind" in error) {
    const kind = (error as { kind?: unknown }).kind;
    if (["validation", "auth", "forbidden", "conflict", "method", "service"].includes(String(kind))) {
      return kind as DashboardFailure;
    }
  }
  return "service";
};

interface SaveOptions<TSettings, TData> {
  serialize: () =>
    | { success: true; data: TSettings }
    | { success: false; errors: readonly string[]; fieldErrors: Record<string, string> };
  save: (settings: TSettings) => Promise<unknown>;
  refresh: () => Promise<TData>;
  transition: Transition;
}

export async function runOwnerSave<TSettings, TData>(options: SaveOptions<TSettings, TData>) {
  const serialized = options.serialize();
  if (!serialized.success) {
    options.transition("validation");
    return { state: "validation" as const, fieldErrors: serialized.fieldErrors };
  }
  options.transition("saving");
  try {
    await options.save(serialized.data);
    const data = await options.refresh();
    options.transition("success");
    return { state: "success" as const, data };
  } catch (error) {
    const state = failureState(error);
    options.transition(state);
    return { state };
  }
}

interface RestoreOptions<TData> {
  key: string;
  confirm: () => boolean;
  restore: (key: string) => Promise<unknown>;
  refresh: () => Promise<TData>;
  transition: Transition;
}

export async function runOwnerRestore<TData>(options: RestoreOptions<TData>) {
  if (!options.confirm()) return { state: "cancelled" as const };
  options.transition("restoring");
  try {
    await options.restore(options.key);
    const data = await options.refresh();
    options.transition("success");
    return { state: "success" as const, data };
  } catch (error) {
    const state = failureState(error);
    options.transition(state);
    return { state };
  }
}
