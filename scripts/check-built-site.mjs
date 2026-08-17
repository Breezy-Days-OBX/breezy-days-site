import { readFile, readdir, stat } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const canonicalOrigins = new Set(["https://breezydaysobx.com", "https://www.breezydaysobx.com"]);

async function walkFiles(root) {
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) files.push(...(await walkFiles(path)));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

const displayPath = (root, path) => relative(root, path).split(sep).join("/");

function referencesFromHtml(html) {
  const references = [];
  for (const tag of html.matchAll(
    /<(a|area|form|iframe|img|input|link|script|source|video)\b[^>]*>/gi,
  )) {
    const tagName = tag[1].toLowerCase();
    const linkRel = /\brel\s*=\s*(["'])(.*?)\1/i.exec(tag[0])?.[2].toLowerCase();
    const tagTargetsPage =
      tagName === "a" ||
      tagName === "area" ||
      tagName === "form" ||
      (tagName === "link" && linkRel?.split(/\s+/).includes("canonical"));
    for (const attribute of tag[0].matchAll(
      /\b(action|href|poster|src|srcset)\s*=\s*(["'])(.*?)\2/gi,
    )) {
      const name = attribute[1].toLowerCase();
      if (name === "srcset") {
        for (const candidate of attribute[3].split(",")) {
          const value = candidate.trim().split(/\s+/)[0];
          if (value) references.push({ value, kind: "asset" });
        }
      } else {
        references.push({
          value: attribute[3],
          kind: tagTargetsPage ? "page" : "asset",
        });
      }
    }
  }
  return references;
}

function referencesFromCss(css) {
  return [...css.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)].map((match) => ({
    value: match[2],
    kind: "asset",
  }));
}

function localReference(value, sourceRoute) {
  const trimmed = value.trim();
  if (
    !trimmed ||
    /^(?:data|mailto|tel|javascript|blob):/i.test(trimmed) ||
    trimmed.startsWith("//")
  ) {
    return null;
  }

  let url;
  try {
    url = new URL(trimmed, `https://breezydaysobx.com${sourceRoute}`);
  } catch {
    return null;
  }
  if (!canonicalOrigins.has(url.origin)) return null;
  return {
    pathname: decodeURIComponent(url.pathname),
    fragment: decodeURIComponent(url.hash.slice(1)),
  };
}

async function existingTarget(root, pathname, kind) {
  const normalized = pathname.replace(/^\/+/, "");
  const exact = resolve(root, normalized);
  const candidates =
    kind === "page" && !extname(normalized)
      ? [exact, `${exact}.html`, resolve(exact, "index.html")]
      : [exact];

  for (const candidate of candidates) {
    if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) continue;
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch {
      // Try the next clean-URL representation.
    }
  }
  return null;
}

function sourceRoute(root, source) {
  const path = `/${displayPath(root, source)}`;
  return path.endsWith("/index.html") ? path.slice(0, -"index.html".length) : path;
}

function hasFragment(html, fragment) {
  const escaped = fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b(?:id|name)=["']${escaped}["']`, "i").test(html);
}

export async function checkBuiltSite(rootDirectory) {
  const root = resolve(rootDirectory);
  const errors = new Set();
  let files;
  try {
    files = await walkFiles(root);
  } catch {
    return [`Build output directory does not exist: ${root}`];
  }

  for (const source of files.filter((file) => /\.(?:css|html)$/i.test(file))) {
    const content = await readFile(source, "utf8");
    const references = source.endsWith(".html")
      ? referencesFromHtml(content)
      : referencesFromCss(content);
    const route = source.endsWith(".html")
      ? sourceRoute(root, source)
      : `/${displayPath(root, source)}`;

    for (const reference of references) {
      const local = localReference(reference.value, route);
      if (!local) continue;
      const target = await existingTarget(root, local.pathname, reference.kind);
      const sourceName = displayPath(root, source);
      if (!target) {
        errors.add(
          `${sourceName}: missing ${reference.kind === "page" ? "internal target" : "asset"} ${local.pathname}`,
        );
        continue;
      }
      if (local.fragment && target.endsWith(".html")) {
        const targetHtml = await readFile(target, "utf8");
        if (!hasFragment(targetHtml, local.fragment)) {
          errors.add(`${sourceName}: missing fragment #${local.fragment} in ${local.pathname}`);
        }
      }
    }
  }

  return [...errors].sort();
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = resolve(process.argv[2] ?? "dist");
  const errors = await checkBuiltSite(root);
  if (errors.length > 0) {
    console.error(
      `Built-site check failed with ${errors.length} problem${errors.length === 1 ? "" : "s"}:`,
    );
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log(
      `Built-site check passed: internal links, fragments, and assets resolve in ${root}.`,
    );
  }
}
