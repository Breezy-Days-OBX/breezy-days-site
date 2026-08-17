import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { checkCspBuild } from "./check-csp.mjs";

const execFileAsync = promisify(execFile);

test("accepts a placeholder analytics build only when every enabled provider endpoint is allowed", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "breezy-csp-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "dist"));
  await writeFile(
    join(root, "dist", "index.html"),
    '<script src="/analytics.js" data-ga4-id="G-PLACEHOLDER" data-clarity-id="clarity-placeholder"></script>',
  );
  await writeFile(
    join(root, "dist", "analytics.js"),
    "https://www.googletagmanager.com/gtag/js https://www.clarity.ms/tag/example",
  );
  await writeFile(
    join(root, "netlify.toml"),
    `[headers.values]\nContent-Security-Policy = "default-src 'self'; script-src 'self' https://www.googletagmanager.com https://www.clarity.ms; connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://www.clarity.ms https://*.clarity.ms https://c.bing.com; img-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com"\n`,
  );

  assert.deepEqual(await checkCspBuild(join(root, "dist"), join(root, "netlify.toml")), []);
});

test("reports the GA and Clarity endpoints that a placeholder analytics build would violate", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "breezy-csp-missing-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "dist"));
  await writeFile(
    join(root, "dist", "index.html"),
    '<script src="/analytics.js" data-ga4-id="G-PLACEHOLDER" data-clarity-id="clarity-placeholder"></script>',
  );
  await writeFile(
    join(root, "dist", "analytics.js"),
    "https://www.googletagmanager.com/gtag/js https://www.clarity.ms/tag/example",
  );
  await writeFile(
    join(root, "netlify.toml"),
    `[headers.values]\nContent-Security-Policy = "default-src 'self'; script-src 'self' https://www.googletagmanager.com https://www.clarity.ms; connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://www.clarity.ms https://*.clarity.ms; img-src 'self' https://www.google-analytics.com https://*.google-analytics.com"\n`,
  );

  assert.deepEqual(await checkCspBuild(join(root, "dist"), join(root, "netlify.toml")), [
    "connect-src is missing https://*.analytics.google.com for GA4",
    "connect-src is missing https://c.bing.com for Clarity",
    "connect-src is missing https://www.googletagmanager.com for GA4",
    "img-src is missing https://*.analytics.google.com for GA4",
    "img-src is missing https://www.googletagmanager.com for GA4",
  ]);
});

test("runs a build with placeholder analytics IDs before checking its CSP", async () => {
  const { stdout } = await execFileAsync(process.execPath, ["scripts/check-csp.mjs"]);

  assert.match(
    stdout,
    /CSP build check passed: placeholder GA4 and Clarity output is fully allowed/,
  );
});
