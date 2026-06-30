import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const excludedDirs = new Set([".git", "node_modules", "site"]);
const excludedFiles = new Set(["package-lock.json"]);

const patterns = [
  {
    name: "AWS account ID",
    regex: /\b\d{12}\b/g,
  },
  {
    name: "AWS access key",
    regex: /\b(AKIA|ASIA)[A-Z0-9]{16}\b/g,
  },
  {
    name: "Private key",
    regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g,
  },
  {
    name: "Azure tenant or subscription ID label with concrete value",
    regex: /\b(tenant|subscription)[_-]?id\s*[:=]\s*[0-9a-fA-F-]{20,}/g,
  },
  {
    name: "Hardcoded secret assignment",
    regex: /\b(api[_-]?key|secret|password|token)\s*[:=]\s*["']?(?!<|your-|use-|local-|example|replace|$)[A-Za-z0-9_./+=-]{12,}/gi,
  },
];

const findings = [];

for (const file of walk(rootDir)) {
  const rel = path.relative(rootDir, file);
  if (excludedFiles.has(path.basename(file))) continue;
  const text = fs.readFileSync(file, "utf8");
  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern.regex)];
    for (const match of matches) {
      findings.push(`${rel}: ${pattern.name}: ${match[0].slice(0, 120)}`);
    }
  }
}

if (findings.length) {
  console.error("Public safety scan failed:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log("Public safety scan passed.");

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (excludedDirs.has(entry.name)) continue;
      yield* walk(path.join(dir, entry.name));
      continue;
    }
    if (!entry.isFile()) continue;
    const file = path.join(dir, entry.name);
    if (isTextFile(file)) yield file;
  }
}

function isTextFile(file) {
  return /\.(css|html|js|json|md|mjs|py|svg|txt|ya?ml|env|example)$/i.test(file) || path.basename(file).startsWith(".");
}
