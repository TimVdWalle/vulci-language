// Phase: Phase 15B CLI, distribution, and quality hardening

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

export function parseVersion(value) {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(value ?? "");

  if (match === null) {
    throw new Error(
      "Usage: npm run release -- <major.minor.patch> (for example, 0.17.0)",
    );
  }

  return match.slice(1).map((part) => BigInt(part));
}

export function compareVersions(left, right) {
  const leftParts = parseVersion(left);
  const rightParts = parseVersion(right);

  for (let index = 0; index < leftParts.length; index += 1) {
    if (leftParts[index] < rightParts[index]) return -1;
    if (leftParts[index] > rightParts[index]) return 1;
  }

  return 0;
}

export function assertNextVersion(currentVersion, targetVersion) {
  const [currentMajor, currentMinor, currentPatch] =
    parseVersion(currentVersion);
  const [targetMajor, targetMinor, targetPatch] = parseVersion(targetVersion);
  const isPatch =
    targetMajor === currentMajor &&
    targetMinor === currentMinor &&
    targetPatch === currentPatch + 1n;
  const isMinor =
    targetMajor === currentMajor &&
    targetMinor === currentMinor + 1n &&
    targetPatch === 0n;
  const isMajor =
    targetMajor === currentMajor + 1n &&
    targetMinor === 0n &&
    targetPatch === 0n;

  if (!isPatch && !isMinor && !isMajor) {
    const allowedVersions = [
      `${currentMajor}.${currentMinor}.${currentPatch + 1n}`,
      `${currentMajor}.${currentMinor + 1n}.0`,
      `${currentMajor + 1n}.0.0`,
    ];
    throw new Error(
      `Release ${targetVersion} is not a permitted next version after ${currentVersion}. ` +
        `Choose ${allowedVersions.join(", ")}.`,
    );
  }
}

export function replaceCliVersion(source, currentVersion, targetVersion) {
  const pattern = /export const VULCI_VERSION = "([^"]+)";/;
  const match = pattern.exec(source);

  if (match === null) {
    throw new Error(
      "src/version.ts does not declare VULCI_VERSION as expected.",
    );
  }

  if (match[1] !== currentVersion) {
    throw new Error(
      `src/version.ts is ${match[1]}, but package.json is ${currentVersion}.`,
    );
  }

  return source.replace(
    pattern,
    `export const VULCI_VERSION = "${targetVersion}";`,
  );
}

export function releaseVersionFromSources(
  packageJson,
  packageLock,
  versionSource,
) {
  const versions = {
    "package-lock.json": packageLock.version,
    "package-lock.json root package": packageLock.packages?.[""]?.version,
    "package.json": packageJson.version,
    "src/version.ts": /export const VULCI_VERSION = "([^"]+)";/.exec(
      versionSource,
    )?.[1],
  };

  if (
    Object.values(versions).some((version) => version !== packageJson.version)
  ) {
    throw new Error(
      `Release versions do not match: ${Object.entries(versions)
        .map(([file, version]) => `${file}=${String(version)}`)
        .join(", ")}.`,
    );
  }

  return packageJson.version;
}

export function createCommandRunner(cwd) {
  return (command, arguments_, options = {}) => {
    const capture = options.capture ?? false;
    const result = spawnSync(command, arguments_, {
      cwd,
      encoding: "utf8",
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });

    if (result.error !== undefined) {
      throw new Error(
        `Could not run '${command}'. Install it and make sure it is on PATH.`,
        { cause: result.error },
      );
    }

    const status = result.status ?? 1;
    if (status !== 0 && options.allowFailure !== true) {
      const detail = result.stderr?.trim();
      throw new Error(
        detail === undefined || detail === ""
          ? `Command failed: ${command} ${arguments_.join(" ")}`
          : detail,
      );
    }

    return {
      status,
      stderr: result.stderr ?? "",
      stdout: result.stdout ?? "",
    };
  };
}

export function output(result) {
  return result.stdout.trim();
}

export function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

export function refExists(run, ref) {
  return (
    run("git", ["show-ref", "--verify", "--quiet", ref], {
      allowFailure: true,
      capture: true,
    }).status === 0
  );
}

export function remoteRefExists(run, kind, ref) {
  const result = run("git", ["ls-remote", "--exit-code", kind, "origin", ref], {
    allowFailure: true,
    capture: true,
  });

  if (result.status !== 0 && result.status !== 2) {
    throw new Error(result.stderr.trim() || `Could not inspect remote ${ref}.`);
  }

  return result.status === 0;
}

export function assertClean(run) {
  if (output(run("git", ["status", "--porcelain"], { capture: true })) !== "") {
    throw new Error("The working tree must be clean before releasing.");
  }
}

export function assertMainIsSynchronized(run) {
  const head = output(run("git", ["rev-parse", "HEAD"], { capture: true }));
  const remoteMain = output(
    run("git", ["rev-parse", "origin/main"], { capture: true }),
  );

  if (head !== remoteMain) {
    throw new Error("Local main must match origin/main exactly.");
  }
}

export function versionAtRef(run, ref) {
  const packageJson = JSON.parse(
    output(run("git", ["show", `${ref}:package.json`], { capture: true })),
  );
  return packageJson.version;
}
