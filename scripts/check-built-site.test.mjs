import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { checkBuiltSite } from "./check-built-site.mjs";

async function createBuiltSite() {
  const root = await mkdtemp(join(tmpdir(), "breezy-built-site-"));
  await mkdir(join(root, "about"), { recursive: true });
  await mkdir(join(root, "assets"), { recursive: true });
  await writeFile(
    join(root, "index.html"),
    `<!doctype html>
      <html><body>
        <a href="/about#details">About</a>
        <img src="/assets/hero.jpg" srcset="/assets/hero.jpg 1x, /assets/hero@2x.jpg 2x" alt="">
        <link rel="stylesheet" href="/assets/site.css">
      </body></html>`,
  );
  await writeFile(
    join(root, "about", "index.html"),
    '<!doctype html><html><body><h1 id="details">Details</h1><a href="/">Home</a></body></html>',
  );
  await writeFile(join(root, "assets", "hero.jpg"), "image");
  await writeFile(join(root, "assets", "hero@2x.jpg"), "image");
  await writeFile(
    join(root, "assets", "site.css"),
    'body { background-image: url("/assets/hero.jpg"); }',
  );
  return root;
}

test("accepts a build whose internal pages, fragments, and assets resolve", async (t) => {
  const root = await createBuiltSite();
  t.after(() => rm(root, { recursive: true, force: true }));

  assert.deepEqual(await checkBuiltSite(root), []);
});

test("reports a missing responsive image asset from the referring page", async (t) => {
  const root = await createBuiltSite();
  t.after(() => rm(root, { recursive: true, force: true }));
  await rm(join(root, "assets", "hero@2x.jpg"));

  assert.deepEqual(await checkBuiltSite(root), ["index.html: missing asset /assets/hero@2x.jpg"]);
});

test("reports an internal link whose target fragment is absent", async (t) => {
  const root = await createBuiltSite();
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(
    join(root, "index.html"),
    '<!doctype html><html><body><a href="/about#missing">About</a></body></html>',
  );

  assert.deepEqual(await checkBuiltSite(root), ["index.html: missing fragment #missing in /about"]);
});

test("treats a same-origin canonical link as a page route", async (t) => {
  const root = await createBuiltSite();
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(
    join(root, "index.html"),
    '<!doctype html><html><head><link rel="canonical" href="https://breezydaysobx.com/about/"></head><body></body></html>',
  );

  assert.deepEqual(await checkBuiltSite(root), []);
});
