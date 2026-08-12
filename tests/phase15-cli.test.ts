// Phase 15

import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const tsxCli = path.join(projectRoot, "node_modules", "tsx", "dist", "cli.mjs");
const vulciCli = path.join(projectRoot, "src", "cli.ts");

function withTemporaryDirectory(run: (root: string) => void): void {
  const root = mkdtempSync(path.join(os.tmpdir(), "vulci-phase15-cli-"));

  try {
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function runCli(argument: string, cwd: string) {
  return spawnSync(process.execPath, [tsxCli, vulciCli, argument], {
    cwd,
    encoding: "utf8",
  });
}

test("vulci . selects main.vci and supports its imports", () => {
  withTemporaryDirectory((root) => {
    writeFileSync(
      path.join(root, "main.vci"),
      "import 'helper.vci'\nprint(value: message())\n",
      "utf8",
    );
    writeFileSync(
      path.join(root, "helper.vci"),
      'fn message() returns str {\n  "from directory"\n}\n',
      "utf8",
    );

    const result = runCli(".", root);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), "from directory");
  });
});

test("vulci accepts a directly selected source file", () => {
  withTemporaryDirectory((root) => {
    const nestedDirectory = path.join(root, "nested");
    mkdirSync(nestedDirectory);
    const sourcePath = path.join(nestedDirectory, "selected.vci");
    writeFileSync(sourcePath, "print(value: 42)\n", "utf8");

    const result = runCli(sourcePath, root);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), "42");
  });
});
