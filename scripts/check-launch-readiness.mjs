import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { inspectMarketplaceProof } from "../src/lib/marketplaceProof.mjs";

const defaultProofUrl = new URL("../src/content/marketplace-proof.json", import.meta.url);
const defaultRecordUrl = new URL("../docs/launch-gate-record.json", import.meta.url);

function optionValue(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${name}.`);
  }
  return value;
}

function optionPath(name) {
  const value = optionValue(name);
  return value ? pathToFileURL(resolve(value)) : null;
}

async function readJson(label, url) {
  try {
    return JSON.parse(await readFile(url, "utf8"));
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error";
    throw new Error(`Could not read ${label}: ${detail}`, { cause: error });
  }
}

const ownerApprovalGates = [
  ["dashboardFields", "owner dashboard fields require owner approval"],
  ["publicPolicies", "public policies require owner approval"],
  ["inquiryRetention", "inquiry retention requires owner approval"],
  ["smsChoice", "SMS choice requires owner approval"],
];

const environmentIdGates = ["PUBLIC_GA4_ID", "PUBLIC_CLARITY_ID"];

const productionSmokeGates = [
  ["deployment", "Netlify deployment"],
  ["identityOwnerRole", "Identity invite-only owner role"],
  ["blobs", "Blobs save, snapshot, and restore"],
  ["formsEmailNotification", "Forms email notification delivery"],
  ["responseHeaders", "production response headers"],
  ["analytics", "analytics behavior"],
  ["domainTlsCanonicalHost", "domain, TLS, and canonical host"],
];

function asRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}

function isRequiredString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isRecordedLink(value) {
  if (!isRequiredString(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function hasCompleteSmokeEvidence(value) {
  const evidence = asRecord(value);
  return (
    evidence.status === "passed" &&
    isIsoDate(evidence.observedOn) &&
    isRequiredString(evidence.responsibleOwner) &&
    isRecordedLink(evidence.productionUrl) &&
    evidence.observedResult === "passed" &&
    isRequiredString(evidence.evidenceLocation)
  );
}

function collectMarketplaceBlockers(proof, launchDate) {
  const blockers = [];
  const inspected = inspectMarketplaceProof(proof);
  const issues = new Set(inspected.issues);
  if (issues.has("reverification")) {
    blockers.push(
      `marketplace ratings, counts, and quote permission were last checked ${
        isRequiredString(proof.checkedOn) ? proof.checkedOn : "on an unrecorded date"
      }; reverify them and clear requiresLaunchReverification.`,
    );
  }
  if (issues.has("checked_on") || proof.checkedOn !== launchDate) {
    blockers.push(`marketplace proof must be reverified on the launch date ${launchDate}.`);
  }

  if (issues.has("airbnb_rating")) {
    blockers.push("marketplace proof must record Airbnb rating and review count.");
  }
  if (issues.has("airbnb_link"))
    blockers.push("marketplace proof must record an Airbnb listing link.");

  if (issues.has("vrbo_rating")) {
    blockers.push("marketplace proof must record Vrbo rating and review count.");
  }
  if (issues.has("vrbo_link")) blockers.push("marketplace proof must record a Vrbo listing link.");

  if (issues.has("quote")) {
    blockers.push("marketplace proof must record a quote excerpt and source.");
  }
  if (issues.has("quote_permission")) {
    blockers.push("marketplace proof must record quote permission as approved.");
  }
  return blockers;
}

function collectLaunchBlockers(proof, record, launchDate) {
  const blockers = [];
  blockers.push(...collectMarketplaceBlockers(proof, launchDate));

  if (record.schemaVersion !== 1) blockers.push("launch gate record schemaVersion must be 1.");

  const ownerApproval = asRecord(record.ownerApproval);
  for (const [key, message] of ownerApprovalGates) {
    if (ownerApproval[key] !== "approved") blockers.push(message);
  }

  const environmentIds = asRecord(record.environmentIds);
  for (const id of environmentIdGates) {
    if (!["configured", "waived"].includes(environmentIds[id])) {
      blockers.push(`${id} must be configured or explicitly waived`);
    }
  }

  const productionSmoke = asRecord(record.productionSmoke);
  for (const [key, label] of productionSmokeGates) {
    if (!hasCompleteSmokeEvidence(productionSmoke[key])) {
      blockers.push(
        `production smoke test: ${label} requires complete production evidence (status, observedOn, responsibleOwner, productionUrl, observedResult, evidenceLocation).`,
      );
    }
  }

  return blockers;
}

let proof;
let record;
let launchDate;
try {
  proof = await readJson("marketplace proof", optionPath("--proof") ?? defaultProofUrl);
  record = await readJson("launch gate record", optionPath("--record") ?? defaultRecordUrl);
  launchDate = optionValue("--today") ?? new Date().toISOString().slice(0, 10);
  if (!isIsoDate(launchDate)) throw new Error("Launch date must use YYYY-MM-DD.");
} catch (error) {
  console.error(`Launch blocked: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exitCode = 1;
  process.exit();
}

const blockers = collectLaunchBlockers(asRecord(proof), asRecord(record), launchDate);

if (blockers.length > 0) {
  console.error("Launch blocked:");
  for (const blocker of blockers) console.error(`- ${blocker}`);
  process.exitCode = 1;
} else {
  console.log("Launch readiness gate passed.");
}
