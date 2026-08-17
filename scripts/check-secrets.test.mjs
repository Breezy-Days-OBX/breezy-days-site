import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { checkRepositorySecrets } from "./check-secrets.mjs";

test("allows names-only environment templates and explicit documentation placeholders", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "breezy-secrets-safe-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "docs"));
  await writeFile(join(root, ".env.example"), "PUBLIC_GA4_ID=\nPUBLIC_CLARITY_ID=\n");
  await writeFile(
    join(root, "docs", "setup.md"),
    `Use PUBLIC_GA4_ID=G-XXXXXXXXXX and PUBLIC_CLARITY_ID=your-project-id locally.\nExample token shape: ${"ghp_" + "X".repeat(36)}\n`,
  );

  assert.deepEqual(await checkRepositorySecrets(root), []);
});

test("reports credential-shaped content with the file and pattern name", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "breezy-secrets-found-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "src"));
  await writeFile(join(root, "src", "accidental.txt"), `TOKEN=${"ghp_" + "a".repeat(36)}\n`);

  assert.deepEqual(await checkRepositorySecrets(root), [
    "src/accidental.txt:1: GitHub personal access token",
  ]);
});

test("does not scan generated, dependency, or version-control directories", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "breezy-secrets-excluded-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const token = "ghp_" + "a".repeat(36);
  for (const directory of [
    "node_modules",
    "dist",
    ".git",
    ".astro",
    "playwright-report",
    "test-results",
  ]) {
    await mkdir(join(root, directory), { recursive: true });
    await writeFile(join(root, directory, "generated.txt"), token);
  }

  assert.deepEqual(await checkRepositorySecrets(root), []);
});
