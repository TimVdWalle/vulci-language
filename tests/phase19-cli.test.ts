// Phase 19

import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { CliDependencies, runCli } from "../src/cli-runner.js";

interface CapturedCliResult {
  exitCode: number;
  stderr: string[];
  stdout: string[];
}

async function withTemporaryDirectory(
  run: (directory: string) => Promise<void>,
): Promise<void> {
  const directory = mkdtempSync(path.join(os.tmpdir(), "vulci-phase19-cli-"));

  try {
    await run(directory);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
}

async function captureCli(
  arguments_: string[],
  dependencies: CliDependencies,
): Promise<CapturedCliResult> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const originalLog = console.log;
  const originalError = console.error;

  console.log = (...values: unknown[]) => stdout.push(values.join(" "));
  console.error = (...values: unknown[]) => stderr.push(values.join(" "));

  try {
    return {
      exitCode: await runCli(arguments_, dependencies),
      stderr,
      stdout,
    };
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
}

test("loads the entry-adjacent dotenv file with host precedence", async () => {
  await withTemporaryDirectory(async (directory) => {
    const nested = path.join(directory, "nested");
    mkdirSync(nested);
    const sourcePath = path.join(nested, "program.vci");
    writeFileSync(
      sourcePath,
      'print(value: env("HOST"))\n' +
        'print(value: env("FILE"))\n' +
        'print(value: env("SHARED"))\n',
      "utf8",
    );
    writeFileSync(path.join(directory, ".env"), "FILE=wrong\n", "utf8");
    writeFileSync(
      path.join(nested, ".env"),
      "FILE=adjacent\nSHARED=file\n",
      "utf8",
    );

    const result = await captureCli([sourcePath], {
      hostEnvironment: { HOST: "host", SHARED: "host wins" },
      platform: "linux",
    });

    assert.equal(result.exitCode, 0, result.stderr.join("\n"));
    assert.deepEqual(result.stdout, ["host", "adjacent", "host wins"]);
    assert.deepEqual(result.stderr, []);
  });
});

test("uses an explicit empty host record without reading process secrets", async () => {
  await withTemporaryDirectory(async (directory) => {
    const sourcePath = path.join(directory, "program.vci");
    writeFileSync(
      sourcePath,
      'print(value: env("PATH", fallback: "isolated"))\n',
      "utf8",
    );

    const result = await captureCli([sourcePath], {
      hostEnvironment: {},
      platform: "linux",
    });

    assert.equal(result.exitCode, 0);
    assert.deepEqual(result.stdout, ["isolated"]);
  });
});

test("applies injected host-platform name comparison", async () => {
  await withTemporaryDirectory(async (directory) => {
    const sourcePath = path.join(directory, "program.vci");
    writeFileSync(sourcePath, 'print(value: env("path"))\n', "utf8");

    const result = await captureCli([sourcePath], {
      hostEnvironment: { PATH: "case-insensitive" },
      platform: "win32",
    });

    assert.equal(result.exitCode, 0);
    assert.deepEqual(result.stdout, ["case-insensitive"]);
  });
});

test("reports dotenv failures without leaking environment values", async () => {
  await withTemporaryDirectory(async (directory) => {
    const sourcePath = path.join(directory, "program.vci");
    writeFileSync(sourcePath, 'print(value: "unreached")\n', "utf8");
    writeFileSync(path.join(directory, ".env"), "SECRET='do-not-leak", "utf8");

    const result = await captureCli([sourcePath], {
      hostEnvironment: {},
      platform: "linux",
    });

    assert.equal(result.exitCode, 1);
    assert.deepEqual(result.stdout, []);
    assert.match(result.stderr.join("\n"), /E_ENV_FILE_FORMAT/);
    assert.doesNotMatch(result.stderr.join("\n"), /do-not-leak/);
  });
});
