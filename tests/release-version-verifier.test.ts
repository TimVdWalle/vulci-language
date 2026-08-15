// Phase: Phase 15B CLI, distribution, and quality hardening

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  createCommandRunner,
  remoteRefExists,
} from "../scripts/release-support.mjs";
import { writeVersions } from "./helpers/release-fixture.js";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

test("reports command lookup failures and cross-file version mismatches", () => {
  const temporaryDirectory = mkdtempSync(
    path.join(os.tmpdir(), "vulci-release-verify-test-"),
  );
  const runner = createCommandRunner(temporaryDirectory);

  assert.throws(
    () => runner("definitely-not-a-vulci-command", []),
    /Install it and make sure it is on PATH/,
  );
  assert.throws(
    () =>
      runner(process.execPath, ["-e", "process.exit(2)"], { capture: true }),
    /Command failed/,
  );
  assert.throws(
    () =>
      runner(
        process.execPath,
        ["-e", "console.error('broken');process.exit(2)"],
        {
          capture: true,
        },
      ),
    /broken/,
  );
  assert.equal(
    runner(process.execPath, ["-e", "process.exit(2)"], {
      allowFailure: true,
      capture: true,
    }).status,
    2,
  );
  assert.equal(
    runner(process.execPath, ["-e", "process.stdout.write('captured')"], {
      capture: true,
    }).stdout,
    "captured",
  );
  assert.throws(
    () =>
      remoteRefExists(
        () => ({ status: 1, stderr: "network failure", stdout: "" }),
        "--tags",
        "refs/tags/v0.17.0",
      ),
    /network failure/,
  );

  const usage = spawnSync(
    process.execPath,
    [path.join(projectRoot, "scripts", "release.mjs")],
    { encoding: "utf8" },
  );
  assert.equal(usage.status, 1);
  assert.match(usage.stderr, /major\.minor\.patch/);

  try {
    mkdirSync(path.join(temporaryDirectory, "scripts"));
    mkdirSync(path.join(temporaryDirectory, "src"));
    writeVersions(temporaryDirectory, "0.17.0");
    copyFileSync(
      path.join(projectRoot, "scripts", "verify-release-version.mjs"),
      path.join(temporaryDirectory, "scripts", "verify-release-version.mjs"),
    );
    copyFileSync(
      path.join(projectRoot, "scripts", "release-support.mjs"),
      path.join(temporaryDirectory, "scripts", "release-support.mjs"),
    );
    writeFileSync(
      path.join(temporaryDirectory, "src", "version.ts"),
      '// Phase 16\n\nexport const VULCI_VERSION = "0.16.0";\n',
    );

    const verification = spawnSync(
      process.execPath,
      [
        path.join(temporaryDirectory, "scripts", "verify-release-version.mjs"),
        "v0.17.0",
      ],
      { encoding: "utf8" },
    );

    assert.notEqual(verification.status, 0);
    assert.match(verification.stderr, /Release versions do not match/);
    assert.match(verification.stderr, /src\/version\.ts=0\.16\.0/);
  } finally {
    rmSync(temporaryDirectory, { force: true, recursive: true });
  }
});
