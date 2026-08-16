// Phase 15

import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createRequire, syncBuiltinESMExports } from "node:module";
import { Environment } from "../src/environment.js";
import { Evaluator } from "../src/evaluator.js";
import { Lexer } from "../src/lexer.js";
import { Parser } from "../src/parser.js";
import { RuntimeValue } from "../src/runtime-value.js";
import { TokenType } from "../src/token.js";

function parse(source: string) {
  return new Parser(new Lexer(source).lex()).parse();
}

function writeSource(
  root: string,
  relativePath: string,
  source: string,
): string {
  const filePath = path.join(root, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, source, "utf8");
  return filePath;
}

function withProgram(
  files: Record<string, string>,
  run: (root: string) => void,
): void {
  const root = mkdtempSync(path.join(os.tmpdir(), "vulci-phase15-"));

  try {
    for (const [relativePath, source] of Object.entries(files)) {
      writeSource(root, relativePath, source);
    }

    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function evaluateFile(filePath: string): RuntimeValue {
  const source = readFileSync(filePath, "utf8");
  return new Evaluator(new Environment()).evaluate(parse(source), filePath);
}

test("lexes and parses a leading import statement", () => {
  const tokens = new Lexer("import 'helpers.vci'").lex();
  assert.equal(tokens[0]?.type, TokenType.Import);

  assert.deepEqual(parse("import 'helpers.vci'").statements[0], {
    type: "ImportStatement",
    keyword: {
      type: TokenType.Import,
      lexeme: "import",
      line: 1,
      column: 1,
    },
    pathToken: tokens[1],
    path: "helpers.vci",
  });
});

test("enforces import path syntax", () => {
  const invalid = [
    'import "helpers.vci"',
    "import '''helpers.vci'''",
    "import 'helpers'",
    "import '/helpers.vci'",
    "import 'C:/helpers.vci'",
    String.raw`import 'folder\\helpers.vci'`,
  ];

  for (const source of invalid) {
    assert.throws(() => parse(source));
  }

  const defensiveTokens = new Lexer("import 'helpers.vci'").lex();
  const pathToken = defensiveTokens[1]!;
  delete pathToken.stringSegments;
  assert.throws(() => new Parser(defensiveTokens).parse(), /\.vci.*extension/);
  pathToken.stringSegments = new Lexer('"{{null}}"').lex()[0]!.stringSegments;
  assert.throws(
    () => new Parser(defensiveTokens).parse(),
    /cannot use interpolation/,
  );
});

test("requires imports to form a leading top-level block", () => {
  assert.throws(
    () => parse("$value = 1\nimport 'helpers.vci'"),
    /leading top-level block/,
  );
  assert.throws(() =>
    parse(`fn invalid() returns null {
  import 'helpers.vci'
}`),
  );
});

test("requires source context and reports unreadable imported files", () => {
  assert.throws(
    () => new Evaluator(new Environment()).evaluate(parse("import 'file.vci'")),
    /without an importing source file/,
  );

  withProgram({ "main.vci": "import 'missing.vci'\n" }, (root) => {
    assert.throws(
      () => evaluateFile(path.join(root, "main.vci")),
      /Unable to import 'missing\.vci'/,
    );
  });

  const mutableFs = createRequire(import.meta.url)("node:fs");
  const originalReadFileSync = mutableFs.readFileSync;
  const evaluator = new Evaluator(new Environment());
  const missingProgram = parse("import 'missing.vci'");
  mutableFs.readFileSync = () => {
    throw "unreadable";
  };
  syncBuiltinESMExports();
  try {
    assert.throws(
      () => evaluator.evaluate(missingProgram, "/tmp/main.vci"),
      /Unable to import 'missing\.vci'\. at/,
    );
  } finally {
    mutableFs.readFileSync = originalReadFileSync;
    syncBuiltinESMExports();
  }
});

test("resolves nested imports relative to the importing file", () => {
  withProgram(
    {
      "main.vci": "import 'nested/child.vci'\n$result\n",
      "nested/child.vci":
        "import '../shared/value.vci'\n$result = imported_value()\n",
      "shared/value.vci": "fn imported_value() returns int {\n  42\n}\n",
    },
    (root) => {
      assert.deepEqual(evaluateFile(path.join(root, "main.vci")), {
        type: "Integer",
        value: 42,
      });
    },
  );
});

test("executes imported top-level code at each import point", () => {
  withProgram(
    {
      "main.vci": "import 'step.vci'\nimport './step.vci'\n$count\n",
      "step.vci":
        "$count = if ($count == null) {\n  1\n} else {\n  $count + 1\n}\n",
    },
    (root) => {
      const environment = new Environment();
      environment.define("$count", { type: "Null" });
      const mainPath = path.join(root, "main.vci");
      const result = new Evaluator(environment).evaluate(
        parse(readFileSync(mainPath, "utf8")),
        mainPath,
      );

      assert.deepEqual(result, { type: "Integer", value: 2 });
    },
  );
});

test("shares declarations and globals across source files", () => {
  withProgram(
    {
      "main.vci": `import 'definitions.vci'
fn keep(Imported value) returns Imported {
  value
}
$result = keep(Imported(value: answer()))
($result is Imported, Ready.Yes is Ready, $from_import)`,
      "definitions.vci": `struct Imported {
  int value
}
enum Ready {
  Yes
}
fn answer() returns int {
  42
}
$from_import = true
`,
    },
    (root) => {
      assert.deepEqual(evaluateFile(path.join(root, "main.vci")), {
        type: "Tuple",
        members: [
          { type: "Boolean", value: true },
          { type: "Boolean", value: true },
          { type: "Boolean", value: true },
        ],
      });
    },
  );
});

test("applies imported type-name binding rules to the importing file", () => {
  withProgram(
    {
      "main.vci": `import 'definitions.vci'
fn invalid(Imported value) returns null {
  Imported = value
  null
}`,
      "definitions.vci": `struct Imported {
  int value
}
$side_effect = true`,
    },
    (root) => {
      const environment = new Environment();
      const mainPath = path.join(root, "main.vci");

      assert.throws(
        () =>
          new Evaluator(environment).evaluate(
            parse(readFileSync(mainPath, "utf8")),
            mainPath,
          ),
        /E_STRUCT_DUP: Struct name 'Imported' cannot be rebound/,
      );
      assert.throws(
        () => environment.get("$side_effect"),
        /Undefined variable/,
      );
    },
  );
});

test("makes importing-file declarations available to imported code", () => {
  withProgram(
    {
      "main.vci": `import 'child.vci'
fn parent_value() returns int {
  41
}
$answer`,
      "child.vci": "$answer = parent_value() + 1\n",
    },
    (root) => {
      assert.deepEqual(evaluateFile(path.join(root, "main.vci")), {
        type: "Integer",
        value: 42,
      });
    },
  );
});

test("does not expose declarations from a later import early", () => {
  withProgram(
    {
      "main.vci": "import 'first.vci'\nimport 'second.vci'\n",
      "first.vci": "$value = later()\n",
      "second.vci": "fn later() returns int {\n  42\n}\n",
    },
    (root) => {
      assert.throws(
        () => evaluateFile(path.join(root, "main.vci")),
        /Undefined function 'later'/,
      );
    },
  );
});

test("reports imported-program type names once imports are known", () => {
  withProgram(
    {
      "main.vci": "import 'empty.vci'\n1 is Missing\n",
      "empty.vci": "",
    },
    (root) => {
      assert.throws(
        () => evaluateFile(path.join(root, "main.vci")),
        /Unknown type name 'Missing'/,
      );
    },
  );
});

test("applies normal shared-namespace collisions to repeated imports", () => {
  withProgram(
    {
      "main.vci": "import 'declaration.vci'\nimport 'declaration.vci'\n",
      "declaration.vci": "fn once() returns null {\n  null\n}\n",
    },
    (root) => {
      assert.throws(
        () => evaluateFile(path.join(root, "main.vci")),
        /Function 'once' is already defined/,
      );
    },
  );
});

test("allows imported depth 64 and rejects attempted depth 65", () => {
  withProgram({}, (root) => {
    for (let index = 0; index <= 64; index++) {
      const source =
        index === 64 ? "$depth = 64\n" : `import 'level-${index + 1}.vci'\n`;
      writeSource(root, `level-${index}.vci`, source);
    }

    assert.deepEqual(evaluateFile(path.join(root, "level-0.vci")), {
      type: "Null",
    });

    writeSource(root, "level-64.vci", "import 'level-65.vci'\n");
    writeSource(root, "level-65.vci", "$depth = 65\n");

    assert.throws(
      () => evaluateFile(path.join(root, "level-0.vci")),
      /Maximum import depth of 64 exceeded/,
    );
  });
});

test("does not perform separate cycle detection", () => {
  withProgram({ "main.vci": "import 'main.vci'\n" }, (root) => {
    assert.throws(
      () => evaluateFile(path.join(root, "main.vci")),
      /Maximum import depth of 64 exceeded/,
    );
  });
});
