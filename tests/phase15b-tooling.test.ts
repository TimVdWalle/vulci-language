// Phase 16

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const formulaGenerator = path.join(
  projectRoot,
  "scripts",
  "generate-homebrew-formula.mjs",
);
const versionVerifier = path.join(
  projectRoot,
  "scripts",
  "verify-release-version.mjs",
);
const packageJson = JSON.parse(
  readFileSync(path.join(projectRoot, "package.json"), "utf8"),
) as { version: string };

function runScript(script: string, ...arguments_: string[]) {
  return spawnSync(process.execPath, [script, ...arguments_], {
    cwd: projectRoot,
    encoding: "utf8",
  });
}

test("accepts only the release tag matching the package version", () => {
  const accepted = runScript(versionVerifier, `v${packageJson.version}`);
  const rejected = runScript(versionVerifier, "v0.1.15");

  assert.equal(accepted.status, 0, accepted.stderr);
  assert.equal(accepted.stdout, `Verified release v${packageJson.version}\n`);
  assert.notEqual(rejected.status, 0);
  assert.match(
    rejected.stderr,
    new RegExp(`must match 'v${packageJson.version}'`),
  );
});

test("generates a two-architecture Homebrew formula with verified checksums", () => {
  const temporaryDirectory = mkdtempSync(
    path.join(os.tmpdir(), "vulci-homebrew-test-"),
  );
  const tapDirectory = path.join(temporaryDirectory, "tap");
  const armChecksumPath = path.join(temporaryDirectory, "arm64.sha256");
  const x64ChecksumPath = path.join(temporaryDirectory, "x64.sha256");

  try {
    writeFileSync(armChecksumPath, `${"a".repeat(64)}  vulci-arm64\n`);
    writeFileSync(x64ChecksumPath, `${"b".repeat(64)}  vulci-x64\n`);

    const generated = runScript(
      formulaGenerator,
      tapDirectory,
      "TimVdWalle/vulci-language",
      "0.16.0",
      armChecksumPath,
      x64ChecksumPath,
    );

    assert.equal(generated.status, 0, generated.stderr);

    const formula = readFileSync(
      path.join(tapDirectory, "Formula", "vulci.rb"),
      "utf8",
    );

    assert.match(formula, /^# Phase: Phase 15B/m);
    assert.match(formula, /vulci-0\.16\.0-macos-arm64/);
    assert.match(formula, /vulci-0\.16\.0-macos-x64/);
    assert.match(formula, new RegExp(`sha256 "${"a".repeat(64)}"`));
    assert.match(formula, new RegExp(`sha256 "${"b".repeat(64)}"`));
    assert.match(formula, /chmod 0755, bin\/"vulci"/);
    assert.match(formula, /shell_output\("#\{bin\}\/vulci --version"\)/);
  } finally {
    rmSync(temporaryDirectory, { force: true, recursive: true });
  }
});

test("rejects missing formula arguments and malformed checksums", () => {
  const temporaryDirectory = mkdtempSync(
    path.join(os.tmpdir(), "vulci-homebrew-test-"),
  );
  const invalidChecksumPath = path.join(temporaryDirectory, "invalid.sha256");

  try {
    writeFileSync(invalidChecksumPath, "not-a-checksum\n");

    const missing = runScript(formulaGenerator);
    const malformed = runScript(
      formulaGenerator,
      path.join(temporaryDirectory, "tap"),
      "TimVdWalle/vulci-language",
      "0.16.0",
      invalidChecksumPath,
      invalidChecksumPath,
    );

    assert.notEqual(missing.status, 0);
    assert.match(missing.stderr, /Usage: generate-homebrew-formula/);
    assert.notEqual(malformed.status, 0);
    assert.match(malformed.stderr, /Invalid SHA-256 checksum/);
  } finally {
    rmSync(temporaryDirectory, { force: true, recursive: true });
  }
});
