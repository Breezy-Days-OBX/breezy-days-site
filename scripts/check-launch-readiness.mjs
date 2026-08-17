import { readFile } from "node:fs/promises";

const proofUrl = new URL("../src/content/marketplace-proof.json", import.meta.url);
const proof = JSON.parse(await readFile(proofUrl, "utf8"));

if (proof.requiresLaunchReverification) {
  console.error(
    `Launch blocked: marketplace ratings, counts, and quote permission were last checked ${proof.checkedOn}. Reverify them and set requiresLaunchReverification to false.`,
  );
  process.exitCode = 1;
} else {
  console.log(`Launch proof gate passed. Marketplace proof checked ${proof.checkedOn}.`);
}
