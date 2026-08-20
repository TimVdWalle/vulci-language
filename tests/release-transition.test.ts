// Phase: Phase 15B CLI, distribution, and quality hardening

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { planRelease } from "../scripts/plan-release.mjs";
import { assertNextVersion } from "../scripts/release-support.mjs";
import { createReleaseFixture } from "./helpers/release-fixture.js";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

test("accepts exactly one patch, minor, or major release step", () => {
  assert.doesNotThrow(() => assertNextVersion("0.19.0", "0.19.1"));
  assert.doesNotThrow(() => assertNextVersion("0.19.0", "0.20.0"));
  assert.doesNotThrow(() => assertNextVersion("0.19.0", "1.0.0"));
  assert.doesNotThrow(() => assertNextVersion("2.7.4", "2.7.5"));
  assert.doesNotThrow(() => assertNextVersion("2.7.4", "2.8.0"));
  assert.doesNotThrow(() => assertNextVersion("2.7.4", "3.0.0"));
});

test("rejects skipped, repeated, older, and malformed release steps", () => {
  for (const version of ["0.19.0", "0.19.2", "0.21.0", "2.0.0"]) {
    assert.throws(
      () => assertNextVersion("0.19.0", version),
      /not a permitted next version/,
    );
  }
  assert.throws(
    () => assertNextVersion("0.19.0", "0.18.9"),
    /not a permitted next version/,
  );
  assert.throws(
    () => assertNextVersion("0.19.0", "0.20.0-beta.1"),
    /major\.minor\.patch/,
  );
});

test("plans a new release or a safe retry from aligned version sources", async () => {
  const fixture = createReleaseFixture({
    localVersion: "0.19.0",
    remoteVersion: "0.19.0",
  });

  try {
    assert.deepEqual(await planRelease("0.20.0", { root: fixture.root }), {
      currentVersion: "0.19.0",
      state: "prepare",
      targetVersion: "0.20.0",
    });
    assert.deepEqual(await planRelease("0.19.0", { root: fixture.root }), {
      currentVersion: "0.19.0",
      state: "resume",
      targetVersion: "0.19.0",
    });
    await assert.rejects(
      planRelease("0.18.0", { root: fixture.root }),
      /older than current version/,
    );
    await assert.rejects(
      planRelease("0.21.0", { root: fixture.root }),
      /not a permitted next version/,
    );
  } finally {
    fixture.cleanup();
  }
});

test("reports plan script usage errors without a stack trace", () => {
  const accepted = spawnSync(
    process.execPath,
    [path.join(projectRoot, "scripts", "plan-release.mjs"), "0.18.0"],
    { encoding: "utf8" },
  );
  const result = spawnSync(
    process.execPath,
    [path.join(projectRoot, "scripts", "plan-release.mjs")],
    { encoding: "utf8" },
  );

  assert.equal(accepted.status, 0, accepted.stderr);
  assert.deepEqual(JSON.parse(accepted.stdout), {
    currentVersion: "0.17.0",
    state: "prepare",
    targetVersion: "0.18.0",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /major\.minor\.patch/);
  assert.doesNotMatch(result.stderr, /at planRelease/);
});
