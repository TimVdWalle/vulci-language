// Phase 19

import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  ExecutionEnvironment,
  platformEnvironmentNameComparison,
} from "../src/execution-environment.js";

function withTemporaryDirectory(run: (directory: string) => void): void {
  const directory = mkdtempSync(path.join(os.tmpdir(), "vulci-phase19-env-"));

  try {
    run(directory);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
}

test("captures an immutable host layer and ignores undefined entries", () => {
  const host: Record<string, string | undefined> = {
    EMPTY: "",
    PRESENT: "captured",
    UNDEFINED: undefined,
  };
  const environment = new ExecutionEnvironment(host, null, "case-sensitive");

  host.PRESENT = "changed";

  assert.equal(environment.get("PRESENT"), "captured");
  assert.equal(environment.get("EMPTY"), "");
  assert.equal(environment.get("UNDEFINED"), undefined);
  assert.equal(environment.get("MISSING"), undefined);
});

test("loads the accepted flat dotenv format", () => {
  withTemporaryDirectory((directory) => {
    const filePath = path.join(directory, ".env");
    writeFileSync(
      filePath,
      "  # comment\r\n\r\nPLAIN=  value # text=kept\r\n" +
        "EMPTY=\r\nSINGLE='quoted value'\r\nDOUBLE=\"double value\"\r\n" +
        "LITERAL=${PLAIN}\r\n",
      "utf8",
    );

    const environment = new ExecutionEnvironment(
      {},
      filePath,
      "case-sensitive",
    );

    assert.equal(environment.get("PLAIN"), "  value # text=kept");
    assert.equal(environment.get("EMPTY"), "");
    assert.equal(environment.get("SINGLE"), "quoted value");
    assert.equal(environment.get("DOUBLE"), "double value");
    assert.equal(environment.get("LITERAL"), "${PLAIN}");
  });
});

test("gives the host layer precedence, including for an empty value", () => {
  withTemporaryDirectory((directory) => {
    const filePath = path.join(directory, ".env");
    writeFileSync(filePath, "SHARED=file\nFILE_ONLY=file\n", "utf8");

    const environment = new ExecutionEnvironment(
      { HOST_ONLY: "host", SHARED: "" },
      filePath,
      "case-sensitive",
    );

    assert.equal(environment.get("HOST_ONLY"), "host");
    assert.equal(environment.get("FILE_ONLY"), "file");
    assert.equal(environment.get("SHARED"), "");
  });
});

test("follows host-platform environment-name comparison", () => {
  assert.equal(platformEnvironmentNameComparison("win32"), "case-insensitive");
  assert.equal(platformEnvironmentNameComparison("linux"), "case-sensitive");
  assert.ok(
    ["case-sensitive", "case-insensitive"].includes(
      platformEnvironmentNameComparison(),
    ),
  );

  const insensitive = new ExecutionEnvironment(
    { Path: "host" },
    null,
    "case-insensitive",
  );
  const sensitive = new ExecutionEnvironment(
    { Path: "host" },
    null,
    "case-sensitive",
  );

  assert.equal(insensitive.get("PATH"), "host");
  assert.equal(sensitive.get("PATH"), undefined);
});

test("rejects malformed dotenv entries without exposing values", () => {
  const cases = [
    ["MISSING_DELIMITER", 1],
    ["1INVALID=secret", 1],
    ["SPACED =secret", 1],
    ["UNCLOSED='secret", 1],
    ["TRAILING='secret'after", 1],
    ["EMBEDDED='sec'ret'", 1],
    ["DUPLICATE=first\nDUPLICATE=second", 2],
    ["LONE_CR=value\rNEXT=other", 1],
    ["FINAL_CR=value\r", 1],
  ] as const;

  for (const [contents, line] of cases) {
    withTemporaryDirectory((directory) => {
      const filePath = path.join(directory, ".env");
      writeFileSync(filePath, contents, "utf8");

      assert.throws(
        () => new ExecutionEnvironment({}, filePath, "case-sensitive"),
        (error: unknown) => {
          assert.match(String(error), /E_ENV_FILE_FORMAT/);
          assert.match(String(error), new RegExp(`line ${line}\\.`));
          assert.doesNotMatch(String(error), /secret|first|second/);
          return true;
        },
      );
    });
  }
});

test("detects duplicates using case-insensitive host behavior", () => {
  withTemporaryDirectory((directory) => {
    const filePath = path.join(directory, ".env");
    writeFileSync(filePath, "Path=first\nPATH=second\n", "utf8");

    assert.throws(
      () => new ExecutionEnvironment({}, filePath, "case-insensitive"),
      /E_ENV_FILE_FORMAT.*line 2/,
    );

    const environment = new ExecutionEnvironment(
      {},
      filePath,
      "case-sensitive",
    );
    assert.equal(environment.get("Path"), "first");
    assert.equal(environment.get("PATH"), "second");
  });
});

test("rejects invalid UTF-8 and unreadable environment files", () => {
  withTemporaryDirectory((directory) => {
    const invalidPath = path.join(directory, "invalid.env");
    writeFileSync(invalidPath, Buffer.from([0xc3, 0x28]));
    assert.throws(
      () => new ExecutionEnvironment({}, invalidPath),
      /E_ENV_FILE_FORMAT.*valid UTF-8/,
    );

    const unreadablePath = path.join(directory, "directory.env");
    mkdirSync(unreadablePath);
    assert.throws(
      () => new ExecutionEnvironment({}, unreadablePath),
      /E_ENV_FILE_READ/,
    );
  });
});

test("reloads atomically and treats a deleted file as an empty layer", () => {
  withTemporaryDirectory((directory) => {
    const filePath = path.join(directory, ".env");
    writeFileSync(filePath, "FILE_VALUE=before\n", "utf8");
    const environment = new ExecutionEnvironment(
      { HOST_VALUE: "host" },
      filePath,
      "case-sensitive",
    );

    writeFileSync(filePath, "FILE_VALUE='broken\n", "utf8");
    assert.throws(() => environment.reload(), /E_ENV_FILE_FORMAT/);
    assert.equal(environment.get("FILE_VALUE"), "before");

    writeFileSync(filePath, "FILE_VALUE=after\n", "utf8");
    environment.reload();
    assert.equal(environment.get("FILE_VALUE"), "after");

    unlinkSync(filePath);
    environment.reload();
    assert.equal(environment.get("FILE_VALUE"), undefined);
    assert.equal(environment.get("HOST_VALUE"), "host");
  });
});
