import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const fixtures = new URL("./fixtures/launch-readiness/", import.meta.url);
const script = fileURLToPath(new URL("./check-launch-readiness.mjs", import.meta.url));

const fixtureToday = "2026-08-17";

function fixturePath(name) {
  return fileURLToPath(new URL(name, fixtures));
}

function runLaunchCheck(proof, record) {
  return execFileAsync(process.execPath, [
    script,
    "--proof",
    fixturePath(proof),
    "--record",
    fixturePath(record),
    "--today",
    fixtureToday,
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
      for (const expected of [
        "owner dashboard fields require owner approval",
        "public policies require owner approval",
        "inquiry retention requires owner approval",
        "SMS choice requires owner approval",
        "PUBLIC_GA4_ID must be configured or explicitly waived",
        "PUBLIC_CLARITY_ID must be configured or explicitly waived",
        "production smoke test: Netlify deployment",
        "production smoke test: Identity invite-only owner role",
        "production smoke test: Blobs save, snapshot, and restore",
        "production smoke test: Forms email notification delivery",
        "production smoke test: production response headers",
        "production smoke test: analytics behavior",
        "production smoke test: domain, TLS, and canonical host",
      ]) {
        assert.match(error.stderr, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      }
      return true;
    },
  );
});

test("blocks marketplace proof missing links and quote permission", async () => {
  await assert.rejects(
    runLaunchCheck("incomplete-marketplace-proof.json", "all-clear-record.json"),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /Airbnb listing link/);
      assert.match(error.stderr, /Vrbo listing link/);
      assert.match(error.stderr, /quote permission/);
      return true;
    },
  );
});

test("blocks proof that was not reverified on the launch day", async () => {
  await assert.rejects(
    runLaunchCheck("stale-marketplace-proof.json", "all-clear-record.json"),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /must be reverified on the launch date 2026-08-17/);
      return true;
    },
  );
});

test("blocks bare smoke status strings even when every status says passed", async () => {
  await assert.rejects(
    runLaunchCheck("all-clear-marketplace-proof.json", "bare-smoke-record.json"),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /Netlify deployment requires complete production evidence/);
      return true;
    },
  );
});

test("requires every documented field in a passed smoke-evidence object", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "breezy-launch-evidence-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const completeRecord = JSON.parse(await readFile(fixturePath("all-clear-record.json"), "utf8"));

  for (const field of [
    "observedOn",
    "responsibleOwner",
    "productionUrl",
    "observedResult",
    "evidenceLocation",
  ]) {
    const record = structuredClone(completeRecord);
    delete record.productionSmoke.deployment[field];
    const recordPath = join(root, `${field}.json`);
    await writeFile(recordPath, JSON.stringify(record));

    await assert.rejects(
      execFileAsync(process.execPath, [
        script,
        "--proof",
        fixturePath("all-clear-marketplace-proof.json"),
        "--record",
        recordPath,
        "--today",
        fixtureToday,
      ]),
      (error) => {
        assert.equal(error.code, 1);
        assert.match(error.stderr, /Netlify deployment requires complete production evidence/);
        return true;
      },
    );
  }
});

test("fails closed for malformed passed smoke evidence", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "breezy-launch-malformed-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const record = JSON.parse(await readFile(fixturePath("all-clear-record.json"), "utf8"));
  record.productionSmoke.deployment = [];
  const recordPath = join(root, "malformed.json");
  await writeFile(recordPath, JSON.stringify(record));

  await assert.rejects(
    execFileAsync(process.execPath, [
      script,
      "--proof",
      fixturePath("all-clear-marketplace-proof.json"),
      "--record",
      recordPath,
      "--today",
      fixtureToday,
    ]),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /Netlify deployment requires complete production evidence/);
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
