import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const checkedRoots = [
  path.join(rootDir, "examples"),
  path.join(rootDir, "notebooks"),
  path.join(rootDir, ".github", "workflows"),
  path.join(rootDir, ".env.example"),
];

const sourceFiles = checkedRoots
  .flatMap((entry) => [...collect(entry)])
  .filter((file) => /\.(env\.example|ipynb|py|ya?ml)$/i.test(file));
const findings = [];

for (const file of sourceFiles) {
  const rel = path.relative(rootDir, file);
  const text = fs.readFileSync(file, "utf8");
  const newlineCount = (text.match(/\n/g) || []).length;

  if (newlineCount < 2) {
    findings.push(`${rel}: expected a multi-line source file, found ${newlineCount} newline(s)`);
  }

  if (!text.endsWith("\n")) {
    findings.push(`${rel}: missing trailing newline`);
  }

  if (file.endsWith(".ipynb")) {
    validateNotebook(rel, text, findings);
  }
}

if (findings.length) {
  console.error("Example source formatting check failed:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

const pythonFiles = sourceFiles.filter((file) => file.endsWith(".py"));
const python = process.env.PYTHON || "python3";
const pythonCheck = `
import ast
import pathlib
import sys

for raw_path in sys.argv[1:]:
    path = pathlib.Path(raw_path)
    ast.parse(path.read_text(), filename=str(path))
`;

const result = spawnSync(python, ["-c", pythonCheck, ...pythonFiles], {
  cwd: rootDir,
  encoding: "utf8",
});

if (result.error) {
  console.error(`Could not run ${python}: ${result.error.message}`);
  process.exit(1);
}

if (result.status !== 0) {
  process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}

console.log(`Example checks passed for ${sourceFiles.length} source files.`);

function validateNotebook(rel, text, findings) {
  let notebook;
  try {
    notebook = JSON.parse(text);
  } catch (error) {
    findings.push(`${rel}: invalid JSON notebook (${error.message})`);
    return;
  }

  if (notebook.nbformat !== 4 || !Array.isArray(notebook.cells)) {
    findings.push(`${rel}: expected nbformat 4 with a cells array`);
    return;
  }

  for (const [index, cell] of notebook.cells.entries()) {
    if (!cell.id) {
      findings.push(`${rel}: cell ${index + 1} is missing an id`);
    }
    if (cell.cell_type === "code") {
      if (cell.execution_count !== null) {
        findings.push(`${rel}: code cell ${index + 1} should have null execution_count`);
      }
      if (Array.isArray(cell.outputs) && cell.outputs.length > 0) {
        findings.push(`${rel}: code cell ${index + 1} should be committed output-free`);
      }
    }
  }
}

function* collect(entry) {
  const stat = fs.statSync(entry);
  if (stat.isDirectory()) {
    yield* walk(entry);
    return;
  }
  if (stat.isFile()) yield entry;
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "__pycache__") continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(file);
      continue;
    }
    if (entry.isFile()) yield file;
  }
}
