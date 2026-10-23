import { netlifySettingsHandlers } from "./_shared/netlifySettings";

export default async (request: Request) => {
  const response = await netlifySettingsHandlers.publicSettings(request);
  response.headers.set("X-Runtime-Node", process.version);
  return response;
};
