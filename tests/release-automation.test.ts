// Phase: Phase 15B CLI, distribution, and quality hardening

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { release } from "../scripts/release.mjs";
import {
  compareVersions,
  parseVersion,
  releaseVersionFromSources,
  replaceCliVersion,
} from "../scripts/release-support.mjs";
import { createReleaseFixture as createFixture } from "./helpers/release-fixture.js";

test("validates, compares, and replaces release versions", () => {
  assert.deepEqual(parseVersion("0.17.0"), [0n, 17n, 0n]);
  assert.equal(compareVersions("0.17.0", "0.16.9"), 1);
  assert.equal(compareVersions("1.0.0", "1.0.0"), 0);
  assert.equal(compareVersions("1.0.0", "2.0.0"), -1);
  assert.throws(() => parseVersion("v0.17.0"), /major\.minor\.patch/);
  assert.throws(() => parseVersion("01.0.0"), /major\.minor\.patch/);

  const source = 'export const VULCI_VERSION = "0.16.0";\n';
  assert.equal(
    replaceCliVersion(source, "0.16.0", "0.17.0"),
    'export const VULCI_VERSION = "0.17.0";\n',
  );
  assert.throws(
    () => replaceCliVersion(source, "0.15.0", "0.17.0"),
    /package\.json is 0\.15\.0/,
  );
  assert.throws(() => replaceCliVersion("", "0.16.0", "0.17.0"), /declare/);

  const packageJson = { version: "0.17.0" };
  const packageLock = {
    packages: { "": { version: "0.17.0" } },
    version: "0.17.0",
  };
  assert.equal(
    releaseVersionFromSources(
      packageJson,
      packageLock,
      source.replace("0.16.0", "0.17.0"),
    ),
    "0.17.0",
  );
  assert.throws(
    () => releaseVersionFromSources(packageJson, packageLock, source),
    /src\/version\.ts=0\.16\.0/,
  );
});

test("prepares a version-only branch, commit, push, and pull request", () => {
  const fixture = createFixture({
    localVersion: "0.16.0",
    remoteVersion: "0.16.0",
  });

  try {
    const stage = release("0.17.0", {
      log: (message: string) => fixture.logs.push(message),
      root: fixture.root,
      run: fixture.run,
    });

    assert.equal(stage, "prepared");
    assert.equal(
      JSON.parse(readFileSync(path.join(fixture.root, "package.json"), "utf8"))
        .version,
      "0.17.0",
    );
    assert.match(
      readFileSync(path.join(fixture.root, "src", "version.ts"), "utf8"),
      /VULCI_VERSION = "0\.17\.0"/,
    );
    assert.ok(fixture.calls.includes("git switch -c release/v0.17.0"));
    assert.ok(fixture.calls.includes("npm run check"));
    assert.ok(fixture.calls.includes("npm run coverage"));
    assert.ok(
      fixture.calls.includes(
        "git add package.json package-lock.json src/version.ts",
      ),
    );
    assert.ok(
      fixture.calls.some((call) => call.startsWith("gh pr create --base main")),
    );
    assert.match(fixture.logs[0] ?? "", /Merge the PR/);
  } finally {
    fixture.cleanup();
  }
});

test("publishes from merged main and safely resumes an existing release", () => {
  const publish = createFixture({
    branch: "release/v0.17.0",
    localVersion: "0.17.0",
    remoteVersion: "0.17.0",
  });

  try {
    assert.equal(
      release("0.17.0", { root: publish.root, run: publish.run }),
      "published",
    );
    assert.ok(publish.calls.includes("git switch main"));
    assert.ok(publish.calls.includes("git merge --ff-only origin/main"));
    assert.ok(publish.calls.includes("git tag -a v0.17.0 -m Vulci 0.17.0"));
    assert.ok(publish.calls.includes("git push origin v0.17.0"));
  } finally {
    publish.cleanup();
  }

  const existing = createFixture({
    localTag: true,
    localVersion: "0.17.0",
    remoteTag: true,
    remoteVersion: "0.17.0",
  });

  try {
    assert.equal(
      release("0.17.0", {
        log: (message: string) => existing.logs.push(message),
        root: existing.root,
        run: existing.run,
      }),
      "published",
    );
    assert.equal(existing.calls.includes("npm run check"), false);
    assert.match(existing.logs[0] ?? "", /already published/);
  } finally {
    existing.cleanup();
  }
});

test("refuses invalid repository and version states before mutation", () => {
  const dirty = createFixture({
    dirty: true,
    localVersion: "0.16.0",
    remoteVersion: "0.16.0",
  });
  const old = createFixture({
    localVersion: "0.16.0",
    remoteVersion: "0.17.0",
  });

  try {
    assert.throws(
      () => release("0.17.0", { root: dirty.root, run: dirty.run }),
      /working tree must be clean/,
    );
    assert.throws(
      () => release("0.16.0", { root: old.root, run: old.run }),
      /older than origin\/main/,
    );
  } finally {
    dirty.cleanup();
    old.cleanup();
  }
});

test("rejects conflicting release refs and unexpected changed files", () => {
  const cases = [
    {
      fixture: createFixture({
        localVersion: "0.17.0",
        remoteVersion: "0.16.0",
      }),
      message: /not a permitted next version/,
    },
    {
      fixture: createFixture({
        localBranch: true,
        localVersion: "0.16.0",
        remoteVersion: "0.16.0",
      }),
      message: /Local branch 'release\/v0\.17\.0' already exists/,
    },
    {
      fixture: createFixture({
        localVersion: "0.16.0",
        remoteBranch: true,
        remoteVersion: "0.16.0",
      }),
      message: /Remote branch 'release\/v0\.17\.0' already exists/,
    },
    {
      fixture: createFixture({
        localTag: true,
        localVersion: "0.16.0",
        remoteVersion: "0.16.0",
      }),
      message: /Tag 'v0\.17\.0' already exists locally/,
    },
    {
      fixture: createFixture({
        localVersion: "0.16.0",
        remoteTag: true,
        remoteVersion: "0.16.0",
      }),
      message: /Tag 'v0\.17\.0' already exists remotely/,
    },
    {
      fixture: createFixture({
        changedFiles:
          "package-lock.json\npackage.json\nsrc/version.ts\nREADME.md\n",
        localVersion: "0.16.0",
        remoteVersion: "0.16.0",
      }),
      message: /Expected only release files to change/,
    },
  ];

  for (const { fixture, message } of cases) {
    try {
      assert.throws(
        () => release("0.17.0", { root: fixture.root, run: fixture.run }),
        message,
      );
    } finally {
      fixture.cleanup();
    }
  }
});

test("rejects unsynchronized branches and tags pointing elsewhere", () => {
  const cases = [
    {
      fixture: createFixture({
        branch: "feature",
        localVersion: "0.16.0",
        remoteVersion: "0.16.0",
      }),
      message: /Prepare a release from a clean, synchronized main branch/,
    },
    {
      fixture: createFixture({
        localVersion: "0.16.0",
        remoteHead: "different-commit",
        remoteVersion: "0.16.0",
      }),
      message: /Local main must match origin\/main exactly/,
    },
    {
      fixture: createFixture({
        localTag: true,
        localVersion: "0.17.0",
        remoteTag: true,
        remoteVersion: "0.17.0",
        taggedCommit: "different-commit",
      }),
      message: /exists but does not point to origin\/main/,
    },
    {
      fixture: createFixture({
        localTag: true,
        localVersion: "0.17.0",
        remoteVersion: "0.17.0",
        taggedCommit: "different-commit",
      }),
      message: /exists locally but does not point to origin\/main/,
    },
  ];

  for (const { fixture, message } of cases) {
    try {
      assert.throws(
        () => release("0.17.0", { root: fixture.root, run: fixture.run }),
        message,
      );
    } finally {
      fixture.cleanup();
    }
  }

  const resumable = createFixture({
    localTag: true,
    localVersion: "0.17.0",
    remoteVersion: "0.17.0",
  });
  try {
    assert.equal(
      release("0.17.0", { root: resumable.root, run: resumable.run }),
      "published",
    );
    assert.equal(
      resumable.calls.includes("git tag -a v0.17.0 -m Vulci 0.17.0"),
      false,
    );
    assert.ok(resumable.calls.includes("git push origin v0.17.0"));
  } finally {
    resumable.cleanup();
  }
});
