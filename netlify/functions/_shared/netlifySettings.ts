import { getStore } from "@netlify/blobs";
import { getUser, verifyRequestOrigin } from "@netlify/identity";

import { createSettingsHandlers } from "./settingsService";

const store = getStore({ name: "owner-settings", consistency: "strong" });

export const netlifySettingsHandlers = createSettingsHandlers({
  store,
  getUser: async () => {
    const user = await getUser();
    return user
      ? { id: user.id, roles: user.roles, email: user.email }
      : null;
  },
  verifyOrigin: verifyRequestOrigin,
  now: () => new Date(),
  createId: () => crypto.randomUUID(),
});
