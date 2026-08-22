import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const script = fileURLToPath(new URL("./check-owner-access.mjs", import.meta.url));

async function withConfig(t, contents) {
  const root = await mkdtemp(join(tmpdir(), "breezy-owner-access-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const configPath = join(root, "netlify.toml");
  await writeFile(configPath, contents);
  return configPath;
}

test("accepts owner routes without an edge redirect", async (t) => {
  const configPath = await withConfig(
    t,
    `[[headers]]\n  for = "/owner/*"\n  [headers.values]\n    Cache-Control = "private, no-store"\n`,
  );

  const { stdout, stderr } = await execFileAsync(process.execPath, [script, configPath]);
  assert.equal(stderr, "");
  assert.match(stdout, /Owner access architecture check passed/);
});

test("rejects an exact dashboard edge redirect", async (t) => {
  const configPath = await withConfig(
    t,
    `[[redirects]]\n  from = "/owner/dashboard"\n  to = "/owner/dashboard"\n  status = 200\n  conditions = { Role = ["owner"] }\n`,
  );

  await assert.rejects(execFileAsync(process.execPath, [script, configPath]), (error) => {
    assert.equal(error.code, 1);
    assert.match(error.stderr, /must not be redirected at the Netlify edge/);
    return true;
  });
});

test("rejects a wildcard dashboard fallback redirect", async (t) => {
  const configPath = await withConfig(
    t,
    `[[redirects]]\n  from = "/owner/dashboard/*"\n  to = "/owner?access=denied"\n  status = 302\n`,
  );

  await assert.rejects(execFileAsync(process.execPath, [script, configPath]), (error) => {
    assert.equal(error.code, 1);
    assert.match(error.stderr, /must not be redirected at the Netlify edge/);
    return true;
  });
});

test("rejects dashboard redirects with valid TOML comments", async (t) => {
  const configPath = await withConfig(
    t,
    `[[redirects]]\n  from = "/owner/dashboard" # protect the owner route\n  to = "/owner/dashboard"\n  status = 200\n`,
  );

  await assert.rejects(execFileAsync(process.execPath, [script, configPath]), (error) => {
    assert.equal(error.code, 1);
    assert.match(error.stderr, /must not be redirected at the Netlify edge/);
    return true;
  });
});

test("rejects dashboard redirects with spaced TOML table syntax", async (t) => {
  const configPath = await withConfig(
    t,
    `[[ redirects ]]\n  from = "/owner/dashboard/*"\n  to = "/owner?access=denied"\n  status = 302\n`,
  );

  await assert.rejects(execFileAsync(process.execPath, [script, configPath]), (error) => {
    assert.equal(error.code, 1);
    assert.match(error.stderr, /must not be redirected at the Netlify edge/);
    return true;
  });
});
