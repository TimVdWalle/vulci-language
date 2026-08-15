// Phase 15B

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { releaseVersionFromSources } from "./release-support.mjs";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const packageJson = JSON.parse(
  await readFile(path.join(projectRoot, "package.json"), "utf8"),
);
const packageLock = JSON.parse(
  await readFile(path.join(projectRoot, "package-lock.json"), "utf8"),
);
const versionSource = await readFile(
  path.join(projectRoot, "src", "version.ts"),
  "utf8",
);
const tag = process.argv[2];
const version = releaseVersionFromSources(
  packageJson,
  packageLock,
  versionSource,
);
const expectedTag = `v${version}`;

if (tag !== expectedTag) {
  throw new Error(`Release tag '${tag}' must match '${expectedTag}'.`);
}

console.log(`Verified release ${tag}`);
