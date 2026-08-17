import { execFile } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const requiredSources = {
  ga4: {
    script: ["https://www.googletagmanager.com"],
    connect: [
      "https://www.google-analytics.com",
      "https://*.google-analytics.com",
      "https://*.analytics.google.com",
      "https://www.googletagmanager.com",
    ],
    image: [
      "https://www.google-analytics.com",
      "https://*.google-analytics.com",
      "https://*.analytics.google.com",
      "https://www.googletagmanager.com",
    ],
  },
  clarity: {
    script: ["https://www.clarity.ms"],
    connect: ["https://www.clarity.ms", "https://*.clarity.ms", "https://c.bing.com"],
    image: [],
  },
};

async function filesWithExtension(root, extension) {
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) files.push(...(await filesWithExtension(path, extension)));
    else if (entry.isFile() && path.endsWith(extension)) files.push(path);
  }
  return files;
}

function directivesFromConfig(config) {
  const policy = /Content-Security-Policy\s*=\s*"([^"]+)"/.exec(config)?.[1];
  if (!policy) return new Map();
  return new Map(
    policy.split(";").map((directive) => {
      const [name, ...sources] = directive.trim().split(/\s+/);
      return [name, new Set(sources)];
    }),
  );
}

function missingSources(directives, provider, enabled) {
  if (!enabled) return [];
  const errors = [];
  for (const [directive, sources] of [
    ["script-src", requiredSources[provider].script],
    ["connect-src", requiredSources[provider].connect],
    ["img-src", requiredSources[provider].image],
  ]) {
    const allowed = directives.get(directive) ?? new Set();
    for (const source of sources) {
      if (!allowed.has(source))
        errors.push(
          `${directive} is missing ${source} for ${provider === "ga4" ? "GA4" : "Clarity"}`,
        );
    }
  }
  return errors;
}

export async function checkCspBuild(buildDirectory, netlifyConfigPath) {
  const [htmlFiles, config] = await Promise.all([
    filesWithExtension(resolve(buildDirectory), ".html"),
    readFile(netlifyConfigPath, "utf8"),
  ]);
  const html = await Promise.all(htmlFiles.map((file) => readFile(file, "utf8")));
  const rendered = html.join("\n");
  const ga4Enabled = /data-ga4-id="[^"]+"/.test(rendered);
  const clarityEnabled = /data-clarity-id="[^"]+"/.test(rendered);
  const loaderEnabled = /<script[^>]+src="\/analytics\.js"/.test(rendered);
  const errors = [];
  if ((ga4Enabled || clarityEnabled) && !loaderEnabled)
    errors.push("placeholder analytics build is missing /analytics.js");
  const directives = directivesFromConfig(config);
  errors.push(...missingSources(directives, "ga4", ga4Enabled));
  errors.push(...missingSources(directives, "clarity", clarityEnabled));
  return errors.sort();
}

async function buildWithPlaceholderAnalytics() {
  await execFileAsync(process.execPath, ["node_modules/astro/bin/astro.mjs", "build"], {
    env: {
      ...process.env,
      PUBLIC_GA4_ID: "G-PLACEHOLDER",
      PUBLIC_CLARITY_ID: "clarity-placeholder",
    },
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildWithPlaceholderAnalytics();
  const errors = await checkCspBuild("dist", "netlify.toml");
  if (errors.length > 0) {
    console.error(
      `CSP build check failed with ${errors.length} problem${errors.length === 1 ? "" : "s"}:`,
    );
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log("CSP build check passed: placeholder GA4 and Clarity output is fully allowed.");
  }
}
