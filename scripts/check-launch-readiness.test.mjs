import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const fixtures = new URL("./fixtures/launch-readiness/", import.meta.url);
const script = fileURLToPath(new URL("./check-launch-readiness.mjs", import.meta.url));

function runLaunchCheck(proof, record) {
  return execFileAsync(process.execPath, [
    script,
    "--proof",
    fileURLToPath(new URL(proof, fixtures)),
    "--record",
    fileURLToPath(new URL(record, fixtures)),
  ]);
}

test("passes only when reverification, approvals, environment dispositions, and production smoke checks are complete", async () => {
  const { stdout, stderr } = await runLaunchCheck(
    "all-clear-marketplace-proof.json",
    "all-clear-record.json",
  );

  assert.equal(stderr, "");
  assert.match(stdout, /Launch readiness gate passed/);
});

test("reports every pending external launch gate instead of treating coding completion as launch approval", async () => {
  await assert.rejects(
    runLaunchCheck("all-clear-marketplace-proof.json", "pending-record.json"),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /owner dashboard fields require owner approval/);
      assert.match(error.stderr, /PUBLIC_GA4_ID must be configured or explicitly waived/);
      assert.match(error.stderr, /production smoke test: Netlify deployment/);
      return true;
    },
  );
});

test("blocks marketplace proof that still requires launch-day reverification", async () => {
  await assert.rejects(
    runLaunchCheck("requires-reverification-marketplace-proof.json", "all-clear-record.json"),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /marketplace ratings, counts, and quote permission/);
      return true;
    },
  );
});
