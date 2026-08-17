import { netlifySettingsHandlers } from "./_shared/netlifySettings";

export default (request: Request) => netlifySettingsHandlers.settingsSnapshots(request);
