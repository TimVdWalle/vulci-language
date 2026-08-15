// Phase: Phase 15B CLI, distribution, and quality hardening

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  assertClean,
  assertMainIsSynchronized,
  compareVersions,
  createCommandRunner,
  output,
  parseVersion,
  readJson,
  refExists,
  remoteRefExists,
  replaceCliVersion,
  versionAtRef,
} from "./release-support.mjs";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const releaseFiles = ["package.json", "package-lock.json", "src/version.ts"];

function verifyReleaseFiles(run, root, version) {
  run(process.execPath, [
    path.join(root, "scripts", "verify-release-version.mjs"),
    `v${version}`,
  ]);
}

function runReleaseGates(run) {
  run("npm", ["run", "check"]);
  run("npm", ["run", "coverage"]);
}

function prepareRelease({ log, root, run, version }) {
  const branch = `release/v${version}`;
  const currentVersion = readJson(path.join(root, "package.json")).version;

  if (compareVersions(version, currentVersion) <= 0) {
    throw new Error(
      `Release ${version} must be newer than current version ${currentVersion}.`,
    );
  }

  if (refExists(run, `refs/heads/${branch}`)) {
    throw new Error(`Local branch '${branch}' already exists.`);
  }

  if (remoteRefExists(run, "--heads", `refs/heads/${branch}`)) {
    throw new Error(`Remote branch '${branch}' already exists.`);
  }

  if (refExists(run, `refs/tags/v${version}`)) {
    throw new Error(`Tag 'v${version}' already exists locally.`);
  }

  if (remoteRefExists(run, "--tags", `refs/tags/v${version}`)) {
    throw new Error(`Tag 'v${version}' already exists remotely.`);
  }

  run("gh", ["--version"], { capture: true });
  run("gh", ["auth", "status"], { capture: true });
  run("git", ["switch", "-c", branch]);
  run("npm", ["version", version, "--no-git-tag-version"]);

  const versionFile = path.join(root, "src", "version.ts");
  writeFileSync(
    versionFile,
    replaceCliVersion(
      readFileSync(versionFile, "utf8"),
      currentVersion,
      version,
    ),
  );

  verifyReleaseFiles(run, root, version);
  runReleaseGates(run);

  const changedFiles = output(
    run("git", ["diff", "--name-only"], { capture: true }),
  )
    .split("\n")
    .filter(Boolean)
    .sort();
  const expectedFiles = [...releaseFiles].sort();

  if (JSON.stringify(changedFiles) !== JSON.stringify(expectedFiles)) {
    throw new Error(
      `Expected only release files to change; found: ${changedFiles.join(", ")}.`,
    );
  }

  run("git", ["add", ...releaseFiles]);
  run("git", ["commit", "-m", `🚀 Prepare Vulci ${version}`]);
  run("git", ["push", "--set-upstream", "origin", branch]);
  run("gh", [
    "pr",
    "create",
    "--base",
    "main",
    "--head",
    branch,
    "--title",
    `🚀 Release Vulci ${version}`,
    "--body",
    `REL-PR-${version} — Updates every Vulci version source and passes the complete release gates.`,
  ]);

  log(
    `Prepared release ${version}. Merge the PR, then run this command again.`,
  );
  return "prepared";
}

function publishRelease({ log, root, run, version }) {
  const branch = output(
    run("git", ["branch", "--show-current"], { capture: true }),
  );

  if (branch !== "main") {
    run("git", ["switch", "main"]);
  }

  run("git", ["merge", "--ff-only", "origin/main"]);
  assertClean(run);
  assertMainIsSynchronized(run);
  verifyReleaseFiles(run, root, version);

  const tag = `v${version}`;
  const localTagExists = refExists(run, `refs/tags/${tag}`);
  const remoteTagExists = remoteRefExists(run, "--tags", `refs/tags/${tag}`);

  if (remoteTagExists) {
    const taggedCommit = output(
      run("git", ["rev-list", "-n", "1", tag], { capture: true }),
    );
    const head = output(run("git", ["rev-parse", "HEAD"], { capture: true }));

    if (taggedCommit !== head) {
      throw new Error(`${tag} exists but does not point to origin/main.`);
    }

    log(`${tag} is already published from this main commit.`);
    return "published";
  }

  runReleaseGates(run);

  if (localTagExists) {
    const taggedCommit = output(
      run("git", ["rev-list", "-n", "1", tag], { capture: true }),
    );
    const head = output(run("git", ["rev-parse", "HEAD"], { capture: true }));

    if (taggedCommit !== head) {
      throw new Error(
        `${tag} exists locally but does not point to origin/main.`,
      );
    }
  } else {
    run("git", ["tag", "-a", tag, "-m", `Vulci ${version}`]);
  }

  run("git", ["push", "origin", tag]);
  log(
    `Published ${tag}. Follow https://github.com/TimVdWalle/vulci-language/actions`,
  );
  return "published";
}

export function release(
  version,
  {
    log = console.log,
    root = projectRoot,
    run = createCommandRunner(root),
  } = {},
) {
  parseVersion(version);
  assertClean(run);
  run("git", ["fetch", "--prune", "--tags", "origin"]);
  assertClean(run);

  const remoteVersion = versionAtRef(run, "origin/main");
  const comparison = compareVersions(version, remoteVersion);

  if (comparison < 0) {
    throw new Error(
      `Release ${version} is older than origin/main version ${remoteVersion}.`,
    );
  }

  if (comparison === 0) {
    return publishRelease({ log, root, run, version });
  }

  const branch = output(
    run("git", ["branch", "--show-current"], { capture: true }),
  );
  if (branch !== "main") {
    throw new Error(
      "Prepare a release from a clean, synchronized main branch.",
    );
  }

  assertMainIsSynchronized(run);
  return prepareRelease({ log, root, run, version });
}

const isMain =
  process.argv[1] !== undefined &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  try {
    release(process.argv[2]);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
