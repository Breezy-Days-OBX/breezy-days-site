import { readFile, readdir } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const excludedDirectories = new Set([
  ".astro",
  ".git",
  ".netlify",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results",
]);

const patterns = [
  ["Private key", /-----BEGIN (?:DSA |EC |OPENSSH |RSA )?PRIVATE KEY-----/g],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/g],
  ["GitHub personal access token", /\bgh[pousr]_[A-Za-z0-9]{36,255}\b/g],
  ["GitHub fine-grained token", /\bgithub_pat_[A-Za-z0-9_]{40,255}\b/g],
  ["Google API key", /\bAIza[0-9A-Za-z_-]{35}\b/g],
  ["Slack token", /\bxox[baprs]-[0-9A-Za-z-]{20,255}\b/g],
  ["Stripe secret key", /\b(?:rk|sk)_(?:live|test)_[0-9A-Za-z]{20,255}\b/g],
  ["Netlify personal access token", /\bnfp_[0-9A-Za-z]{30,255}\b/g],
];

async function walkFiles(root) {
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) files.push(...(await walkFiles(path)));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

const displayPath = (root, path) => relative(root, path).split(sep).join("/");

const placeholderMatch = (value) => /(?:X{8,}|0{16,})/.test(value);

export async function checkRepositorySecrets(rootDirectory) {
  const root = resolve(rootDirectory);
  const findings = [];
  for (const file of await walkFiles(root)) {
    let content;
    try {
      content = await readFile(file, "utf8");
    } catch {
      continue;
    }
    if (content.includes("\0")) continue;

    const lines = content.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      for (const [name, pattern] of patterns) {
        pattern.lastIndex = 0;
        const matches = [...lines[index].matchAll(pattern)];
        if (matches.some((match) => !placeholderMatch(match[0]))) {
          findings.push(`${displayPath(root, file)}:${index + 1}: ${name}`);
        }
      }
    }
  }
  return findings.sort();
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = resolve(process.argv[2] ?? ".");
  const findings = await checkRepositorySecrets(root);
  if (findings.length > 0) {
    console.error(
      `Secret-pattern check failed with ${findings.length} finding${findings.length === 1 ? "" : "s"}:`,
    );
    for (const finding of findings) console.error(`- ${finding}`);
    process.exitCode = 1;
  } else {
    console.log("Secret-pattern check passed: no credential-shaped repository content found.");
  }
}
