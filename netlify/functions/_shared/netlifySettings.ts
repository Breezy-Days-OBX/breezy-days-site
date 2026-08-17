import { getStore } from "@netlify/blobs";
import { getUser, verifyRequestOrigin } from "@netlify/identity";

import { createSettingsHandlers, type BlobStore } from "./settingsService";

const netlifyStore = getStore({
  name: "owner-settings",
  consistency: "strong",
});
const store: BlobStore = {
  get: (key) => netlifyStore.get(key, { type: "text" }),
  getWithMetadata: async (key) => {
    const entry = await netlifyStore.getWithMetadata(key);
    if (!entry) return null;
    if (!entry.etag) throw new Error("Blob read did not return an ETag");
    return { data: entry.data, etag: entry.etag };
  },
  set: (key, value, options) => netlifyStore.set(key, value, options),
  list: (options) => netlifyStore.list(options),
};

export const netlifySettingsHandlers = createSettingsHandlers({
  store,
  getUser: async () => {
    const user = await getUser();
    return user ? { id: user.id, roles: user.roles, email: user.email } : null;
  },
  verifyOrigin: verifyRequestOrigin,
  now: () => new Date(),
  createId: () => crypto.randomUUID(),
});
