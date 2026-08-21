// Phase: Phase 15B CLI, distribution, and quality hardening

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  assertNextVersion,
  compareVersions,
  releaseVersionFromSources,
  resolveReleaseTarget,
} from "./release-support.mjs";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
export async function planRelease(selection, { root = projectRoot } = {}) {
  const packageJson = JSON.parse(
    await readFile(path.join(root, "package.json"), "utf8"),
  );
  const packageLock = JSON.parse(
    await readFile(path.join(root, "package-lock.json"), "utf8"),
  );
  const versionSource = await readFile(
    path.join(root, "src", "version.ts"),
    "utf8",
  );
  const currentVersion = releaseVersionFromSources(
    packageJson,
    packageLock,
    versionSource,
  );
  const targetVersion = resolveReleaseTarget(currentVersion, selection);
  const comparison = compareVersions(targetVersion, currentVersion);

  if (comparison < 0) {
    throw new Error(
      `Release ${targetVersion} is older than current version ${currentVersion}.`,
    );
  }

  if (comparison > 0) {
    assertNextVersion(currentVersion, targetVersion);
  }

  return {
    currentVersion,
    state: comparison === 0 ? "resume" : "prepare",
    targetVersion,
  };
}

const isMain =
  process.argv[1] !== undefined &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  try {
    console.log(JSON.stringify(await planRelease(process.argv[2])));
  } catch (error) {
    console.error(String(error));
    process.exitCode = 1;
  }
}
