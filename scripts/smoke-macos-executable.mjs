// Phase 15B

import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execute = promisify(execFile);
const executablePath = process.argv[2];
const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const packageJson = JSON.parse(
  await readFile(path.join(projectRoot, "package.json"), "utf8"),
);

if (executablePath === undefined) {
  throw new Error("Usage: npm run smoke:executable -- <executable-path>");
}

const version = await execute(executablePath, ["--version"]);

if (version.stdout.trim() !== `Vulci ${packageJson.version}`) {
  throw new Error(`Unexpected version output: ${version.stdout.trim()}`);
}

const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "vulci-sea-"));
const sourcePath = path.join(temporaryDirectory, "smoke.vci");

try {
  await writeFile(sourcePath, "print(value: 42)\n", "utf8");
  const execution = await execute(executablePath, [sourcePath]);

  if (execution.stdout.trim() !== "42") {
    throw new Error(`Unexpected program output: ${execution.stdout.trim()}`);
  }
} finally {
  await rm(temporaryDirectory, { force: true, recursive: true });
}

console.log(`Verified ${executablePath}`);
