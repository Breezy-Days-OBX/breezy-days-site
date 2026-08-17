import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const defaultProofUrl = new URL("../src/content/marketplace-proof.json", import.meta.url);
const defaultRecordUrl = new URL("../docs/launch-gate-record.json", import.meta.url);

function optionPath(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${name}.`);
  }
  return pathToFileURL(resolve(value));
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

function collectLaunchBlockers(proof, record) {
  const blockers = [];
  if (proof.requiresLaunchReverification !== false) {
    blockers.push(
      `marketplace ratings, counts, and quote permission were last checked ${
        typeof proof.checkedOn === "string" ? proof.checkedOn : "on an unrecorded date"
      }; reverify them and clear requiresLaunchReverification.`,
    );
  }

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
    if (productionSmoke[key] !== "passed") {
      blockers.push(`production smoke test: ${label}`);
    }
  }

  return blockers;
}

let proof;
let record;
try {
  proof = await readJson("marketplace proof", optionPath("--proof") ?? defaultProofUrl);
  record = await readJson("launch gate record", optionPath("--record") ?? defaultRecordUrl);
} catch (error) {
  console.error(`Launch blocked: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exitCode = 1;
  process.exit();
}

const blockers = collectLaunchBlockers(asRecord(proof), asRecord(record));

if (blockers.length > 0) {
  console.error("Launch blocked:");
  for (const blocker of blockers) console.error(`- ${blocker}`);
  process.exitCode = 1;
} else {
  console.log("Launch readiness gate passed.");
}
