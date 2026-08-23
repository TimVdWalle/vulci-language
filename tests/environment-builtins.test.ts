// Phase 19

import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { registerBuiltins } from "../src/builtins.js";
import { Environment } from "../src/environment.js";
import { Evaluator } from "../src/evaluator.js";
import { ExecutionEnvironment } from "../src/execution-environment.js";
import { Lexer } from "../src/lexer.js";
import { Parser } from "../src/parser.js";
import { RuntimeValue } from "../src/runtime-value.js";

function evaluate(
  source: string,
  executionEnvironment = new ExecutionEnvironment({}),
  sourcePath?: string,
): RuntimeValue {
  const environment = new Environment();
  registerBuiltins(environment, executionEnvironment);

  return new Evaluator(environment).evaluate(
    new Parser(new Lexer(source).lex()).parse(),
    sourcePath,
  );
}

function withTemporaryDirectory(run: (directory: string) => void): void {
  const directory = mkdtempSync(
    path.join(os.tmpdir(), "vulci-phase19-builtins-"),
  );

  try {
    run(directory);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
}

test("reads present, empty, missing, and fallback environment values", () => {
  const executionEnvironment = new ExecutionEnvironment({
    EMPTY: "",
    PRESENT: "value",
  });

  assert.deepEqual(evaluate('env("PRESENT")', executionEnvironment), {
    type: "String",
    value: "value",
  });
  assert.deepEqual(evaluate('env(name: "EMPTY")', executionEnvironment), {
    type: "String",
    value: "",
  });
  assert.deepEqual(evaluate('env("MISSING")', executionEnvironment), {
    type: "Null",
  });
  assert.deepEqual(
    evaluate(
      'env(fallback: "fallback", name: "MISSING")',
      executionEnvironment,
    ),
    { type: "String", value: "fallback" },
  );
});

test("validates environment names, argument counts, and argument types", () => {
  for (const name of ["", "1NAME", "HAS-DASH", "HAS SPACE"]) {
    assert.throws(() => evaluate(`env("${name}")`), /E_ENV_NAME/);
  }

  assert.throws(() => evaluate("env()"), /E_ARG_COUNT/);
  assert.throws(
    () => evaluate('env("A", fallback: "B", name: "C")'),
    /E_ARG_COUNT/,
  );
  assert.throws(() => evaluate('reloadEnv("extra")'), /E_ARG_COUNT/);
  assert.throws(() => evaluate("env(1)"), /E_ARG_TYPE.*integer/);
  assert.throws(
    () => evaluate('env("MISSING", fallback: true)'),
    /E_ARG_TYPE.*fallback.*boolean/,
  );
  assert.throws(() => evaluate('env("MISSING", "fallback")'), /must be named/);
});

test("reports useful argument locations and runtime type names", () => {
  assert.throws(() => evaluate("env(1 + 1)"), /E_ARG_TYPE.*at 1:7/);
  assert.throws(
    () =>
      evaluate(`fn number() returns int { 1 }
env(number())`),
    /E_ARG_TYPE.*at 2:5/,
  );
  assert.throws(
    () => evaluate("struct Value {}\nenv(Value())"),
    /E_ARG_TYPE.*Value/,
  );
  assert.throws(
    () => evaluate("enum Status { Ready }\nenv(Status.Ready)"),
    /E_ARG_TYPE.*Status/,
  );
  assert.throws(() => evaluate('env(name: "not-valid")'), /at 1:5/);
});

test("reloadEnv replaces only the dotenv layer and returns null", () => {
  withTemporaryDirectory((directory) => {
    const filePath = path.join(directory, ".env");
    writeFileSync(filePath, "VALUE=before\nSHARED=file\n", "utf8");
    const executionEnvironment = new ExecutionEnvironment(
      { SHARED: "host" },
      filePath,
      "case-sensitive",
    );

    assert.deepEqual(evaluate('env("VALUE")', executionEnvironment), {
      type: "String",
      value: "before",
    });

    writeFileSync(filePath, "VALUE=after\nSHARED=changed\n", "utf8");
    assert.deepEqual(
      evaluate(
        'reloadEnv()\nenv("VALUE") ~ env("SHARED")',
        executionEnvironment,
      ),
      { type: "String", value: "after host" },
    );
    assert.deepEqual(evaluate("reloadEnv", executionEnvironment), {
      type: "Null",
    });
  });
});

test("keeps the previous snapshot when language-level reload fails", () => {
  withTemporaryDirectory((directory) => {
    const filePath = path.join(directory, ".env");
    writeFileSync(filePath, "VALUE=stable\n", "utf8");
    const executionEnvironment = new ExecutionEnvironment({}, filePath);

    writeFileSync(filePath, "VALUE='broken\n", "utf8");
    assert.throws(
      () => evaluate("reloadEnv()", executionEnvironment),
      /E_ENV_FILE_FORMAT/,
    );
    assert.deepEqual(evaluate('env("VALUE")', executionEnvironment), {
      type: "String",
      value: "stable",
    });
  });
});

test("makes one snapshot visible to imported source files", () => {
  withTemporaryDirectory((directory) => {
    const mainPath = path.join(directory, "main.vci");
    const importedPath = path.join(directory, "imported.vci");
    writeFileSync(importedPath, '$imported = env("IMPORTED")\n', "utf8");
    writeFileSync(mainPath, "import 'imported.vci'\n$imported\n", "utf8");

    const source = "import 'imported.vci'\n$imported\n";
    assert.deepEqual(
      evaluate(
        source,
        new ExecutionEnvironment({ IMPORTED: "visible" }),
        mainPath,
      ),
      { type: "String", value: "visible" },
    );
  });
});

test("protects standard-library names while preserving distinct globals", () => {
  assert.throws(
    () => evaluate("fn env() { null }"),
    /Name 'env' is already defined/,
  );
  assert.throws(() => evaluate("struct reloadEnv {}"), /E_STRUCT_DUP/);
  assert.throws(() => evaluate("enum env { Value }"), /E_ENUM_DUP/);
  assert.throws(
    () =>
      evaluate(`fn assign() {
  env = 1
}
assign()`),
    /standard-library function/,
  );
  assert.throws(
    () => evaluate("list[1].each(env) { print(value: env) }"),
    /conflicts with an already-visible binding/,
  );
  assert.deepEqual(evaluate("$env = 19\n$reloadEnv = 20\n$env + $reloadEnv"), {
    type: "Integer",
    value: 39,
  });
});
