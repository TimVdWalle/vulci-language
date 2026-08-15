// Phase: Phase 15B CLI, distribution, and quality hardening

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

interface CommandResult {
  status: number;
  stderr: string;
  stdout: string;
}

interface FixtureOptions {
  branch?: string;
  changedFiles?: string;
  dirty?: boolean;
  head?: string;
  localBranch?: boolean;
  localTag?: boolean;
  localVersion: string;
  remoteBranch?: boolean;
  remoteHead?: string;
  remoteTag?: boolean;
  remoteVersion: string;
  taggedCommit?: string;
}

export function writeVersions(root: string, version: string): void {
  writeFileSync(
    path.join(root, "package.json"),
    `${JSON.stringify({ name: "vulci", version }, null, 2)}\n`,
  );
  writeFileSync(
    path.join(root, "package-lock.json"),
    `${JSON.stringify(
      {
        name: "vulci",
        packages: { "": { name: "vulci", version } },
        version,
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    path.join(root, "src", "version.ts"),
    `// Phase 16\n\nexport const VULCI_VERSION = "${version}";\n`,
  );
}

function writePackageVersions(root: string, version: string): void {
  writeFileSync(
    path.join(root, "package.json"),
    `${JSON.stringify({ name: "vulci", version }, null, 2)}\n`,
  );
  writeFileSync(
    path.join(root, "package-lock.json"),
    `${JSON.stringify(
      {
        name: "vulci",
        packages: { "": { name: "vulci", version } },
        version,
      },
      null,
      2,
    )}\n`,
  );
}

export function createReleaseFixture(options: FixtureOptions) {
  const root = mkdtempSync(path.join(os.tmpdir(), "vulci-release-test-"));
  mkdirSync(path.join(root, "scripts"));
  mkdirSync(path.join(root, "src"));
  writeVersions(root, options.localVersion);

  const calls: string[] = [];
  const logs: string[] = [];
  const head = options.head ?? "release-commit";
  let branch = options.branch ?? "main";

  const result = (status = 0, stdout = "", stderr = ""): CommandResult => ({
    status,
    stderr,
    stdout,
  });

  const run = (command: string, arguments_: string[]): CommandResult => {
    calls.push([command, ...arguments_].join(" "));

    if (command === "git" && arguments_[0] === "status") {
      return result(0, options.dirty === true ? " M wishlist.md\n" : "");
    }
    if (command === "git" && arguments_[0] === "show") {
      return result(0, JSON.stringify({ version: options.remoteVersion }));
    }
    if (command === "git" && arguments_[0] === "branch") {
      return result(0, `${branch}\n`);
    }
    if (command === "git" && arguments_[0] === "rev-parse") {
      const commit =
        arguments_[1] === "origin/main" ? (options.remoteHead ?? head) : head;
      return result(0, `${commit}\n`);
    }
    if (command === "git" && arguments_[0] === "show-ref") {
      const ref = arguments_.at(-1) ?? "";
      if (ref.startsWith("refs/tags/")) {
        return result(options.localTag === true ? 0 : 1);
      }
      return result(options.localBranch === true ? 0 : 1);
    }
    if (command === "git" && arguments_[0] === "ls-remote") {
      const kind = arguments_[2];
      if (kind === "--tags") return result(options.remoteTag === true ? 0 : 2);
      return result(options.remoteBranch === true ? 0 : 2);
    }
    if (command === "git" && arguments_[0] === "switch") {
      branch =
        arguments_[1] === "-c" ? (arguments_[2] ?? branch) : arguments_[1];
      return result();
    }
    if (command === "git" && arguments_[0] === "diff") {
      return result(
        0,
        options.changedFiles ??
          "package-lock.json\npackage.json\nsrc/version.ts\n",
      );
    }
    if (command === "git" && arguments_[0] === "rev-list") {
      return result(0, `${options.taggedCommit ?? head}\n`);
    }
    if (command === "npm" && arguments_[0] === "version") {
      writePackageVersions(root, arguments_[1] ?? "");
      return result();
    }

    return result();
  };

  return {
    calls,
    cleanup: () => rmSync(root, { force: true, recursive: true }),
    logs,
    root,
    run,
  };
}
