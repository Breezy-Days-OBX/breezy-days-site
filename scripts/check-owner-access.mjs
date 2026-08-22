import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse } from "smol-toml";

const configPath = resolve(process.argv[2] ?? "netlify.toml");

let config;
let parsed;
try {
  config = await readFile(configPath, "utf8");
  parsed = parse(config);
} catch (error) {
  const detail = error instanceof Error ? error.message : "unknown error";
  console.error(`Owner access check failed: ${detail}`);
  process.exitCode = 1;
  process.exit();
}

const redirectValue = parsed.redirects;
const redirects = Array.isArray(redirectValue)
  ? redirectValue
  : redirectValue && typeof redirectValue === "object"
    ? [redirectValue]
    : [];
const dashboardRedirect = redirects.find(
  (redirect) =>
    redirect &&
    typeof redirect === "object" &&
    typeof redirect.from === "string" &&
    /^\/owner\/dashboard(?:\/\*)?$/.test(redirect.from),
);

if (dashboardRedirect) {
  console.error(
    "Owner access check failed: /owner/dashboard must not be redirected at the Netlify edge. " +
      "The browser verifies the owner before revealing the dashboard, and owner data remains protected by server functions.",
  );
  process.exitCode = 1;
} else {
  console.log("Owner access architecture check passed.");
}
