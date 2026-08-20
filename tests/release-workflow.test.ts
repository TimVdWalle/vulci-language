// Phase: Phase 15B CLI, distribution, and quality hardening

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function readProjectFile(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

test("coordinates a guarded one-start release", () => {
  const workflow = readProjectFile(".github/workflows/release-version.yml");

  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /version:\n\s+description:/);
  assert.match(workflow, /group: vulci-release/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.match(workflow, /actions: write/);
  assert.match(workflow, /pull-requests: write/);
  assert.match(workflow, /ensure main "\$MAIN_SHA" 1800/);
  assert.match(workflow, /expected_files=.*package-lock\.json/);
  assert.match(workflow, /dispatch "\$RELEASE_BRANCH" "\$HEAD_SHA" 1800/);
  assert.match(workflow, /sleep 120/);
  assert.match(workflow, /\.state.*!= "open"/);
  assert.match(workflow, /--raw-field "sha=\$EXPECTED_HEAD_SHA"/);
  assert.match(workflow, /dispatch main "\$MERGE_SHA" 1800/);
  assert.match(workflow, /if: cancelled\(\)/);
  assert.match(workflow, /gh pr close "\$PR_NUMBER" --delete-branch/);
  assert.match(workflow, /uses: \.\/\.github\/workflows\/release\.yml/);
  assert.doesNotMatch(workflow, /--auto/);
});

test("keeps checks dispatchable and publishing safely reusable", () => {
  const checks = readProjectFile(".github/workflows/check.yml");
  const release = readProjectFile(".github/workflows/release.yml");

  assert.match(checks, /workflow_dispatch:/);
  assert.match(checks, /Checks for release/);
  assert.match(release, /workflow_call:/);
  assert.match(release, /release_ref:/);
  assert.match(release, /release_tag:/);
  assert.match(release, /gh release view "\$RELEASE_TAG"/);
  assert.match(release, /gh release download "\$RELEASE_TAG"/);
  assert.match(release, /shasum -a 256 --check/);
  assert.match(release, /Update Homebrew tap/);
});

test("documents GitHub setup, cancellation, retry, and the local fallback", () => {
  const guide = readProjectFile(".github/RELEASING.md");

  assert.match(guide, /SETUP-ACTIONS-2/);
  assert.match(guide, /RELEASE-CANCEL-1/);
  assert.match(guide, /RELEASE-CANCEL-2/);
  assert.match(guide, /Starting `Release version` again/);
  assert.match(guide, /RELEASE-LOCAL/);
});
