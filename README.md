<!-- Phase: Branding exploration after Phase 17 -->

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="branding/vulci-readme-banner-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="branding/vulci-readme-banner-light.png">
  <img alt="Vulci is built around fewer concepts, clearer code, and a consistent way to work with data." src="branding/vulci-readme-banner-light.png">
</picture>

# Vulci

Vulci is built around fewer concepts, clearer code, and a consistent way to work with data.

Vulci aims to make programs easier to understand by combining a small set of
consistent language features. Its central design goal is one mental model for
working with data, regardless of whether that data comes from memory, files,
databases, APIs, streams, or another source.

> [!IMPORTANT]
> Vulci is a pre-1.0 language under active development. The current reference
> interpreter implements the language through Phase 17 and is suitable for
> exploration, language-design feedback, and small experiments. Breaking
> changes remain possible.

## Quick start

Vulci provides standalone executables for Apple Silicon and Intel macOS. Install
the latest release through Homebrew:

```bash
brew install TimVdWalle/vulci/vulci
```

Create `main.vci`:

```vulci
$numbers = list[1, 2, 3]
$total = 0

$numbers.each(int number) {
    $total = $total + number
}

print("Total: {{$total}}")
```

Run it:

```bash
vulci .
```

Expected output:

```text
Total: 6
```

Use `vulci --help` for all command-line options. Executables and checksums are
also available from [GitHub Releases](https://github.com/TimVdWalle/vulci-language/releases).

## Why Vulci?

Vulci is guided by three core philosophies:

- **One mental model for data.** Data should use the same core operations
  regardless of its representation, source, or shape.
- **Readable and unambiguous code.** Clarity, consistency, and explicit intent
  take priority over cleverness or unnecessary brevity.
- **Small building blocks, powerful combinations.** Complex solutions should
  emerge by composing a limited set of fundamental concepts rather than adding
  many specialized features.

These philosophies are not marketing themes; they are the evaluation framework
for significant language decisions. Read the complete
[language philosophies](project/philosophies.md) and
[project vision](project/project_vision.md).

## What works today

The reference interpreter currently supports:

- integer, Boolean, `null`, and Unicode-aware string values;
- arithmetic, logical operators, comparisons, chained comparisons, and
  expression-oriented conditionals;
- functions with lexical scope, implicit or explicit returns, named and
  optional arguments, type annotations, unions, and nullable types;
- string interpolation, multiline strings, concatenation, joining, comparison,
  and basic string operations;
- tuples, anonymous objects, mutable value-semantic structs, and enums;
- relative `.vci` imports for transparent multi-file programs;
- `list`, `set`, and `map` collections with shared operations, structural
  equality, indexing where applicable, and immutable transformations;
- expression-oriented `each` iteration over strings and collections;
- useful source diagnostics, optional token and AST output, and colour-aware
  command-line help;
- standalone macOS releases and automated Homebrew distribution.

See the [examples](examples) for programs grouped by implementation phase.

## Roadmap

Vulci is developed incrementally, and implementation order does not represent
the long-term importance of a feature. Phase 18, a basic looping construct, is
currently design-blocked until its syntax and semantics are explicitly agreed.

The authoritative [implementation phases](project/implementation/implementation_phases.md)
describe completed work, planned phases, dependencies, and design blockers.
Language rules remain authoritative in the corresponding syntax and semantics
documents under [`project/language`](project/language).

## Editor support

The repository includes a lightweight TextMate bundle for JetBrains IDEs. It
recognizes `.vci` files and provides theme-controlled highlighting for Vulci
syntax, including strings and interpolation, variables, logical operators,
control flow, structs, and enums.

Follow the [JetBrains installation guide](ide/jetbrains/README.md) to add the
bundle to WebStorm or another compatible JetBrains IDE. This integration
provides syntax-level editor support; command-line diagnostics remain
authoritative.

## Documentation

- [Language documentation](project/documentation/language_documentation.md) —
  user-facing explanations and style guidance.
- [Examples](examples) — runnable programs grouped by implementation phase.
- [Project vision](project/project_vision.md) — purpose, ambition, scope, and
  success criteria.
- [Language philosophies](project/philosophies.md) — principles used to evaluate
  significant language decisions.
- [Implementation phases](project/implementation/implementation_phases.md) —
  completed work, planned features, and blockers.
- [Source-of-truth index](project/source_of_truth_index.md) — authority and
  responsibility map for project documents.
- [JetBrains support](ide/jetbrains/README.md) — `.vci` syntax-highlighting setup.
- [GitHub Releases](https://github.com/TimVdWalle/vulci-language/releases) —
  standalone executables and checksums.

## Development

Building Vulci from source requires Node.js 22. Install the dependencies:

```bash
npm ci
```

Run a Vulci source file through the development interpreter:

```bash
npm run dev -- program.vci
```

Available development commands:

```bash
npm run dev              # Run the interpreter from source.
npm run build            # Compile the interpreter.
npm run build:executable # Build a standalone executable on macOS.
npm test                 # Run the automated test suite.
npm run coverage         # Run the test suite with coverage reporting.
npm run smoke            # Run the end-to-end smoke test.
npm run check            # Run formatting, linting, types, tests, and smoke.
```

The executable build targets the Mac's current architecture and writes its
output to `artifacts/`. Before submitting a change, run both `npm run check` and
`npm run coverage`.

## Project background

Vulci is a hobby project, but its language goal is not to produce a toy or a
proof of concept. It is designed with the ambition and discipline of a serious,
general-purpose programming language capable of solving real-world problems.

The project succeeds if it remains enjoyable, sustainable, and educational.
The language succeeds only if its overall quality, consistency, and usefulness
eventually give experienced programmers a reason to choose it over existing
alternatives. Novelty alone is not enough.

A useful summary of the design standard is:

> A programming language should reduce the number of things a programmer needs
> to think about—not increase them.

## Why the name Vulci?

The language is named after the ancient Etruscan city of Vulci in present-day
Italy. The project began while its creator was staying near the archaeological
site, giving the name an authentic origin rather than a manufactured technical
meaning.

Vulci source files use the `.vci` extension. Both the language name and extension
are accepted project decisions, although they may still evolve before a stable
release.
