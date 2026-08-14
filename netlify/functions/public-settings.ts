import type { Context } from "@netlify/functions";

import { netlifySettingsHandlers } from "./_shared/netlifySettings";

export default (request: Request, _context: Context) =>
  netlifySettingsHandlers.publicSettings(request);
