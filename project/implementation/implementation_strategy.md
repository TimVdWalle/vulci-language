<!-- Phase: Phase 15 pre-collections language improvements -->
<!-- Document ID: implementation-strategy -->
<!-- Version: 5 -->
<!-- Status: Active -->
<!-- Authority: Reference-interpreter architecture, mechanics, and temporary constraints -->
<!-- Supersedes: implementation-strategy v4 -->

# Implementation Strategy

## Purpose

This document records the implementation decisions for the language
project.

It describes **how the language is implemented**, not the language
itself.

The language specification (syntax and semantics) remains independent of
any particular implementation.

---

## Reference Implementation

The official reference implementation is written in **TypeScript** and
runs on **Node.js**.

This implementation is considered the primary implementation of the
language, not merely a prototype.

---

## Interpreter Architecture

The initial implementation is a tree-walking interpreter.

Execution pipeline:

Source Code → Lexer → Parser → AST → Evaluator

The evaluator walks the AST directly and executes the program.

No bytecode is generated.

---

## Runtime

The implementation relies on Node.js for:

- Process execution
- Memory allocation
- Garbage collection
- File system access
- Operating system integration

The interpreter itself is responsible only for implementing the language
semantics.

---

## Runtime Values

Vulci runtime values are represented by Vulci-specific runtime value types.
The TypeScript payload used to store a value is an implementation detail and
does not define the language's semantics.

The current TypeScript reference interpreter stores an `Integer` payload using
a TypeScript `number`.

---

## `impl-runtime-001` — Temporary integer safety constraint

Until Vulci's final integer range is decided, the TypeScript reference
interpreter supports only exactly representable safe integers. The temporary
supported range is inclusive from `-9,007,199,254,740,991` through
`9,007,199,254,740,991`.

An integer literal outside this temporary range produces a syntax error. An
arithmetic result outside this temporary range produces a runtime error.

This temporary implementation limit does not define Vulci's final integer
range.

---

## `impl-analysis-001` — Initial type-inference implementation

Local-variable type inference happens during evaluation from the assigned
runtime value. Phase 2 does not add a separate semantic-analysis or static
type-inference pass.

---

## `impl-runtime-002` — Function-call depth safeguard

The reference interpreter enforces its accepted active-call-depth safeguard
before entering a function body. Host-language stack exhaustion must be converted
into the Vulci call-depth diagnostic rather than exposed directly.

This is a reference-interpreter safeguard, not a general syntax rule.

---

## `impl-runtime-003` — Source-file import loading

The reference interpreter loads only the selected entry source file initially.
Additional source files are loaded when execution reaches their top-level import
statements. Imports are processed in source order and must form the accepted
leading top-level import block in each source file. Relative import paths are
resolved from the directory containing the importing source file.

The interpreter keeps the active source-file import chain needed for relative
resolution and the accepted depth safeguard. The entry file has depth `0`; an
imported file may be entered through depth `64`, and an attempted depth `65`
entry must produce the Vulci import-depth error rather than continue recursing.

The active import chain is not a duplicate-import cache. The reference
interpreter does not deduplicate imports or perform separate cycle detection.

---

## Distribution

From Phase 15, the official command-line interface accepts either the current
directory or a source-file entry path:

    vulci .
    vulci <source-file>

`vulci .` selects `./main.vci`. `vulci <source-file>` runs the specified source
file as the entry file. The CLI does not scan the directory for additional Vulci
source files; further files are reached through imports.

Production releases should be distributed as a standalone executable so
users are not be required to install Node.js.

The command-line interface is considered part of the language experience
and should remain stable regardless of implementation changes.

---

## Performance Philosophy

The project prioritizes:

- Correct language semantics
- Simplicity of implementation
- Fast iteration
- Ease of experimentation

Premature runtime optimization is intentionally avoided.

Performance improvements should only be pursued when justified by real
usage and measurement.

---

## Editor Support

### `ide-dec-001` — Lightweight support first

The first JetBrains and WebStorm integration is lightweight editor support.

### `ide-dec-002` — Repository-linked TextMate bundle

The current integration is a TextMate bundle stored in the Vulci repository and
linked from the IDE. Updating the linked repository bundle is the preferred
lightweight upgrade mechanism.

### `ide-dec-003` — Current feature scope

The current integration provides `.vci` file recognition, Phase 14 syntax
highlighting, comments, strings, interpolation, bracket pairing, comment
toggling, and basic indentation.

Phase 14A will assign separate theme-controlled TextMate scopes to ordinary
variables, global variables, logical operators, control-flow keywords, structs,
and enums. The selected editor colour scheme will remain responsible for the
exact colours.

### `ide-dec-004` — No duplicated language analysis

Editor integrations must not introduce a separate implementation of Vulci
parsing, warning rules, or semantic rules when those rules are owned by the
reference implementation.

### `ide-dec-005` — Current warning authority

The reference interpreter's command-line warnings remain authoritative until
reusable Vulci analysis rules are available.

### `ide-dec-006` — Shared future analysis

Future IDE warnings should consume reusable Vulci analysis rules shared with the
command-line interface. The exact analysis API, warning ownership split, and
editor-integration architecture remain undecided.

---

## Future Implementations

The language specification is independent of its implementation.

Future implementations may be written in other languages (for example C,
Rust or Go).

Such implementations should preserve the same language specification and
user-facing interface.

Changing the implementation must not require changes to user programs or
the command-line interface.

---

## Rationale

Choosing TypeScript allows the project to focus on designing the
language rather than implementing low-level runtime infrastructure.

This significantly reduces implementation complexity while keeping all
future implementation options open.

If a native implementation ever becomes desirable, it should be
developed as an additional implementation of the language specification
rather than by automatically translating the TypeScript source.
