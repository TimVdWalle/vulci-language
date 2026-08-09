<!-- Phase: Phase 15 pre-collections language improvements -->
<!-- Document ID: implementation-phases -->
<!-- Version: 17 -->
<!-- Status: Active -->
<!-- Authority: Implementation order, phase scope, dependencies, and completion criteria -->
<!-- Supersedes: implementation-phases v16 -->

# Implementation Phases

This document owns implementation order, phase scope, dependencies, and completion
criteria. Accepted language rules remain authoritative in the syntax and semantics
specifications. Interpreter mechanics remain authoritative in the Implementation
Strategy.

Each phase must:

- Be small and coherent.
- Leave the language in a working state.
- Contain either core language work or standard library work.
- Preserve the agreed ordering unless explicitly changed.

A phase marked **Design-blocked** must not begin until its required syntax and
semantics have been explicitly agreed.

---

## `ph01` Minimal execution — Core

- Run a source file
- Integer literals
- Variables
- Print integers
- Basic syntax/runtime errors

**Result:** Programs can store and print integers.

---

## `ph02` Integer expressions — Core

- Integer arithmetic: `+`, `-`, `*`, `/`, `%`
- Unary negation
- Parenthesised expressions
- Operator precedence
- Left associativity
- Integer digit separators
- Basic type inference
- Temporary safe-integer range validation
- Arithmetic runtime errors
- Operator source locations in arithmetic diagnostics

**Result:** Integer expressions work predictably.

---

## `ph03` Comments — Core

- `//` line comments
- `/* ... */` block comments

**Result:** Programs can contain explanatory text that does not affect execution.

---

## `ph04` Booleans and comparisons — Core

- Boolean literals
- Comparison operators
- Printing booleans

**Result:** Conditions can be represented as explicit values.

---

## `ph05` Logical operators — Core

- `and`
- `or`
- `not`

**Result:** Boolean conditions can be combined and negated.

---

## `ph06` Conditional expressions — Core

- Expression-oriented evaluation
- `if / else`
- `else if`
- Chained comparisons
- Condition validation
- `null` literal and runtime value
- Unmatched conditionals without `else` evaluate to `null`
- Control-flow blocks do not create scopes

**Result:** Programs can make decisions and produce conditional values.

---

## `ph07` Basic functions — Core

- Function definitions
- Function calls
- Parameters
- Function scopes
- Explicit return
- `lf01` Implicit return
- Top-level function declarations only; nested functions are not included
- Top-level functions are available throughout the file
- Lexical scope
- `$`-prefixed global variables
- Undefined-function and non-function call diagnostics
- Implement the reference-interpreter function-call-depth safeguard defined by `impl-runtime-002`
- Verify that excessive call depth produces the accepted Vulci diagnostic without exposing host stack details

**Result:** Reusable logic becomes possible.

---

## `ph08` Function types and warnings — Core

- Optional parameter types
- Union parameter types
- Optional return types
- Omitted types become `any`
- Typed-parameter reassignment restrictions
- Normal warnings for explicit `any`
- Strong warnings for implicit `any`
- One warning per affected parameter or return type declaration, emitted once rather than per call
- Omitted parameter-type warnings point to the parameter name
- Omitted return-type warnings point to the function name
- Union-type validation and nullable unions
- Warnings for whitespace immediately before or after each union separator, pointing to that `|`
- Parser support for continuing an expression when the next non-empty line begins with a binary operator

**Result:** Function boundaries can express type expectations while preserving gradual typing.

---

## `ph09` Convenient calls — Core

- `lf02` Bare zero-argument calls
- `lf04` Named arguments
- Required positional arguments
- Only the first two required parameters may be positional
- Optional parameters must be named
- Named arguments may be reordered
- Positional arguments cannot follow named arguments
- Duplicate arguments are invalid
- `lf05` Optional arguments
- Ordinary default parameter values
- Typed default parameters
- Trailing commas in parameter and argument lists

**Result:** Function calls become concise and readable.

---

## `ph10` Strings — Core

- `str` runtime values and printing
- Double-quoted single-line strings with escapes and `{{expression}}` interpolation
- Single-quoted single-line strings with escapes and no interpolation
- Triple-double-quoted multiline strings with escapes and interpolation
- Triple-single-quoted multiline strings with escapes and no interpolation
- Raw line breaks rejected in single-line literals; `\n` remains valid
- String and interpolation diagnostics with stable short codes and source locations when possible
- Multiline boundary-newline removal and exact common-whitespace-prefix stripping, ignoring whitespace-only lines; tabs and spaces remain distinct
- Interpolation with balanced nested braces and normal Vulci expression evaluation
- Final interpolation conversion only for `str`, `int`, and `bool`
- `str + str` concatenation
- `str ~ str` joining with exactly one ASCII space, including empty operands; `~` shares the left-associative `+`/`-` precedence level
- Exact code-point string equality and case-sensitive code-point ordering
- `str.contains(str)` exact, case-sensitive substring matching without normalization
- General invalid member-call diagnostics: `E_MEM_TYPE`, `E_MEM_UNKNOWN`, `E_ARG_COUNT`, and `E_ARG_TYPE`
- `str.count()` using Unicode extended grapheme clusters under UAX #29 and the Unicode data supplied by the runtime or Unicode library
- Exclude string indexing, slicing, and repetition from Phase 10
- Remove warnings for explicit `any` type declarations
- Remove warnings for whitespace around union separators
- Use the `warning:` label for remaining type warnings instead of `strong warning:`

**Result:** Programs can properly work with text.

---

## `ph11` Tuples — Core

- Positional tuple literals containing at least two members
- Parenthesised expressions remain distinct from tuple literals
- No empty or one-member tuples
- Optional trailing commas under the general comma-separated-list rule
- Fixed-length tuple runtime values
- Tuple member expressions evaluated from left to right
- General bracket indexing with integer-valued index expressions
- Zero-based indexes; negative and out-of-range indexes are runtime errors
- Value semantics, with each member following its own runtime type's assignment semantics
- Tuple printing in parenthesised, comma-separated form, including nested tuples
- Shared indexing diagnostics: `IDX_TARGET`, `IDX_TYPE`, and `IDX_RANGE`
- Generic parser diagnostics for malformed tuple literals
- Dedicated structural tuple-type syntax: `tuple(T1, T2, ...)`
- Tuple types in parameter and function return annotations
- Arity-aware positional tuple-type validation
- Nested tuple types and union types in tuple member positions
- Parser, type representation, runtime validation, diagnostics, and tests for tuple types
- Tuple values continue to use `(value1, value2)` literal syntax

**Result:** Programs can group, access, copy, print, and explicitly type a fixed number of positional values.

---

## `ph12` Anonymous objects — Core

- Anonymous object construction with `object(...)`
- At least one field is required; `object()` is invalid
- Named fields using `name: value`
- Unique field names; duplicates are compile-time errors
- Optional trailing commas under the general comma-separated-list rule
- Member access through `.`, including chained member access
- Fixed shapes
- Immutable fields; field and nested-field assignment are invalid
- Field expressions evaluated exactly once from left to right
- Value semantics, with each field following its runtime type's assignment semantics
- Compact deterministic printing in Vulci construction syntax
- Recursive printing of nested anonymous objects
- Anonymous-object diagnostics: `E_OBJ_EMPTY` and `E_OBJ_DUP`
- General member-access diagnostics: `E_MEM_UNKNOWN` and `E_MEM_TYPE`
- Anonymous objects remain distinct from named reusable struct types
- Anonymous objects are not implicitly compatible with structs

**Result:** Programs can create lightweight structured values without declaring a type.

---

## `ph13` Structs — Core

- Top-level struct declarations that evaluate to `null`
- Struct names registered as both user-defined types and constructors
- Struct names cannot reuse built-in type names, conflict with functions,
  variables, or other structs, or be rebound as variables or parameters
- Struct types valid in every accepted type position
- Typed named fields with unique member names across fields and methods
- Named-only struct construction
- Required and optional fields with per-construction defaults
- Structural construction validation before expression evaluation
- Explicit arguments evaluated once from left to right
- Defaults evaluated afterward in field-declaration order
- Field-default scope and assignment restrictions
- Atomic construction and field type validation
- Empty structs and forward references between top-level structs
- Direct and indirect recursive structs only when every recursive cycle contains
  an explicitly nullable field
- Value semantics and independent assignment copies
- Mutable field and nested-field assignment
- Struct methods and direct member-call syntax
- Implicit read-only `self` binding with mutable fields
- Method calls on temporary values; method values remain unsupported
- Structural equality by declared struct type and recursively equal fields
- Constructor-style printing in field-declaration order
- Stable struct and `self` diagnostic codes
- No implicit anonymous-object compatibility
- No inheritance

**Result:** Programs can define reusable data-focused value types with associated behaviour.

---

## `ph14` Enums — Core

- `lf35` Enums
- Reserved `enum` keyword and top-level braced enum declarations
- At least one bare member name per enum, written one per line
- No associated values, raw values, or backing values in Phase 14
- Enum names as ordinary user-defined type names in every accepted type position
- Qualified enum value references such as `Status.Pending`
- Forward availability of top-level enum declarations
- Shared-namespace collision and duplicate-member validation
- Nominal enum identity containing declaring enum identity and member identity
- Value semantics and independent assignment copies
- Exact enum-type validation for parameters, returns, and unions
- Equality through `==` and `!=`; no ordering, arithmetic, logical, or unary numeric operations
- Qualified normal printing and member-only string interpolation
- Explicit nullability through unions only
- No enum instance fields or methods
- No pattern matching, `match`, `switch`, or exhaustiveness checking
- Stable enum diagnostics, reusing existing diagnostics where their meanings fit
- No enum-specific warnings
- Lexer, parser, AST, evaluator, runtime-value, type-validation, equality,
  printing, interpolation, forward-reference, diagnostic, regression, coverage,
  and smoke tests
- No Phase 16 map or other collection implementation

**Result:** Programs can model closed sets of named alternatives.

---

## `ph14a` Global-variable and editor-support correction — Core

- Require every top-level variable to use the `$` prefix
- Reject ordinary unprefixed variable assignments at the top level
- Preserve ordinary unprefixed local variables inside functions and methods
- Update examples, tests, and smoke coverage for the corrected rule
- Give ordinary variables, global variables, logical operators, control-flow
  keywords, structs, and enums distinct theme-controlled TextMate scopes
- Highlight interpolation expressions only in double-quoted strings

**Result:** Top-level variable syntax matches the accepted explicit-global rule,
and editors can style important Vulci categories through their colour schemes.

---

## `ph15` Pre-collections language improvements — Core

- `ph15_1` Usable `null` equality: `null` compares successfully with any value
  through `==` and `!=` under the accepted null-equality rules
- `ph15_2` Structural tuple equality, including arity checks, recursive member
  equality, nested tuples, and normal member-level equality errors
- `ph15_3` General `value is Type` operator using Vulci's normal type-matching
  rules, with `is` reserved and excluded from chained comparisons
- `ph15_4` Transparent multi-file programs through top-level relative `.vci`
  imports written with single-quoted paths
- `vulci .` selects `./main.vci`; `vulci <source-file>` may select any source
  file directly
- Imports resolve relative to the importing file, execute imported top-level code
  at the import point, and use the same program namespaces without creating
  modules or file namespaces
- No directory scanning, extension inference, duplicate-import cache, or cycle
  detection
- No module/package system in Phase 15; richer module/package work remains
  separately tracked in `ph31`
- Active import depth is limited to `64`, with the entry file at depth `0`
- No collection implementation in Phase 15

**Result:** Programs gain more useful equality and type inspection and can be
organised across multiple source files before collection implementation begins.

---

## `ph16` Collections — Core

- `lf20` Unified collection model
- Distinct `list`, `set`, and `map` values with shared operation names where appropriate
- Broad `collection` boundary type with runtime concrete-type behaviour
- Extend the general `is Type` operator to the accepted concrete, typed, and broad
  collection type forms
- Collection literals, including trailing commas
- Zero-based list access and keyed map access
- Sets use insertion order and have no positional access
- Initial map-key eligibility rules
- Structural equality for lists, sets, maps, and nested collections
- Immutable `add()` operations for lists, sets, and maps, plus `remove()` for lists and sets
- `contains()` semantics for strings, lists, sets, and maps
- Runtime errors when an operation unsupported by a broad `collection` value is reached
- Structural reuse of nested immutable values; no required deep copy
- Transformation ordering guarantees
- Add an explicit Unicode regression test verifying that decomposed graphemes
  (for example `a` followed by U+0301 COMBINING ACUTE ACCENT) are counted as a
  single grapheme by `str.count()`, in accordance with the accepted Unicode
  extended grapheme cluster semantics.

**Result:** Programs can represent multiple values using one collection model.

---

## `ph17` Collection iteration — Core

**Design-blocked:** Exact `each` collection-expression, item-binding, and remaining
loop semantics must be agreed first.

- `col01` Language-level `each` loop
- Brace-delimited loop body
- Execute the body once for every traversed item
- No lambda or function-value dependency

**Result:** Collections can be processed with a language-level loop.

---

## `ph18` Loops — Core

**Design-blocked:** Loop syntax and semantics must be agreed first.

- Basic looping construct

**Result:** Repetitive work is possible without recursion.

---

## `ph19` Environment access — Standard library

- `lib01` Environment variables

**Result:** Programs can read their execution environment.

---

## `ph20` Command-line input — Standard library

- `lib02` Program arguments

**Result:** Useful CLI tools become possible.

---

## `ph21` File handling — Standard library

- `lib03` Read files
- Write files
- Check whether files exist

**Result:** CLI tools can process persistent data.

---

## `ph22` Destructuring — Core

**Design-blocked:** Exact destructuring syntax and semantics must be agreed first.

- `lf07` Destructuring structured values

**Result:** Structured values can be consumed conveniently.

---

## `ph23` Dependent defaults — Core

**Design-blocked:** Evaluation semantics for dependent defaults must be agreed first.

- `lf29` Defaults depending on earlier parameters

**Result:** Functions can expose more expressive APIs.

---

## `ph24` Traits — Core

**Design-blocked:** Trait syntax and semantics must be agreed first.

- `lf16` Reusable behaviour
- Traits usable by structs

**Result:** Behaviour can be composed before classes exist.

---

## `ph25` JSON — Standard library

- `lib05` Parse JSON
- Serialize JSON

**Result:** Files and HTTP can exchange structured data.

---

## `ph26` HTTP — Standard library

- `lib04` HTTP requests
- Methods
- Headers
- Status codes
- Text bodies

**Result:** Programs can communicate with external services.

---

## Future nested functions — Core

**Design-blocked:** Nested-function syntax and capture semantics must be agreed
first.

- Nested function declarations
- Lexical access to variables from enclosing function scopes
- Rules for rebinding variables from enclosing function scopes
- Closure lifetime and capture behaviour

Access to and mutation of enclosing variables remain undecided.

**Result:** Functions may eventually define local helper functions and closures.

---

## `ph27` Function values and lambdas — Core

**Design-blocked:** Function-reference and lambda syntax and semantics must be agreed first.

- `lf12` Store functions
- Pass functions
- Return functions
- `lf03` Lambdas

**Result:** Functions become normal values and behaviour can be written inline.

---

## `ph28` Functional collection operations — Core

**Design-blocked:** Exact anonymous-function syntax must be agreed first.

- `col03` `filter`, preserving the input kind and traversal order
- `col04` `find`, returning the first matching value or `null`
- `count()` with no callback

**Result:** Common collection processing becomes concise and predictable.

---

## `ph29` Reduction — Core

**Design-blocked:** Exact `reduce()` syntax and semantics must be agreed first.

- `col07` `reduce`

**Result:** Arbitrary collection accumulation becomes possible.

---

## `ph30` Advanced collection operations — Core

**Design-blocked:** Exact `group()` syntax and semantics must be agreed first.

- `col05` `sort`
- `col06` `group`

**Result:** Richer data-processing workflows become possible.

---

## `ph31` Imports and modules — Core

**Design-blocked:** Module and import semantics must be agreed first.

- `import`
- Module resolution

**Result:** Programs can organise and reuse code across files or modules.

---

## `ph32` Classes — Core

**Design-blocked:** Class construction, inheritance, visibility, equality, and dispatch semantics must be agreed first.

- `cls01` Classes
- Reference identity
- Construction
- Methods
- Inheritance

**Result:** Programs can define reusable identity-focused reference types.

---

## `ph33` Decimals — Core

**Design-blocked:** Decimal representation and arithmetic semantics must be agreed first.

- Decimal literals
- Decimal digit separators
- Decimal arithmetic

**Result:** Programs can represent and calculate non-integer numeric values.

---

## `ph34` Database access — Standard library

- `lib06` Initial database support

**Result:** Programs can store and query structured persistent data.

---

## Future assertion support — Core — Exact phase undecided

- `future_assert` Programmer assertion support (`assert`)
- Exact assertion syntax and semantics are not yet accepted

**Result:** Assertion support remains visible for future design without becoming
part of Phase 15.

---

## `phLater` Later collection work — Exact phase undecided

The following accepted names, deferred decisions, and future collection-related
features must remain represented in the implementation plan until assigned to
concrete numbered phases:

- Exact `map()` semantics and implementation phase
- `any()` semantics
- `all()` semantics
- `containsValue()` for maps
- `removeAll()`
- Bulk additions
- Removal by index or map key
- Replacement and update operations by index or key
- Safe collection access
- Collection conversions
- Exact anonymous-function syntax
- Capabilities system
- Pattern matching for runtime collection types
- Contextual loop metadata and nested-loop behaviour
- Future or user-defined collection types

**Result:** Deferred collection work remains visible until its exact design and
implementation phase are agreed.

---

## Editor support work

### `ide4-now` — Lightweight JetBrains and WebStorm support

- Repository-linked TextMate bundle
- `.vci` file recognition
- Phase 14 syntax highlighting
- Comments, strings, and interpolation highlighting
- Bracket pairing and comment toggling
- Basic indentation
- No duplicated Vulci parsing, warning rules, or semantic rules
- Command-line warnings remain authoritative

**Result:** Vulci source files receive useful lightweight editor support while
the language continues to evolve.

### Future editor analysis — Exact phase undecided

The following work remains undecided and must not be treated as accepted
implementation architecture or phase scope:

- The exact reusable Vulci analysis API
- When warnings move out of the parser
- Whether future integration uses LSP, a native JetBrains plugin, or a hybrid
- Which warnings become IDE-only and which remain available through the CLI
- Completion, navigation, refactoring, formatting, and other semantic features
- Exact implementation phases for advanced editor support
- Distribution through the JetBrains Marketplace

Future IDE warnings should consume reusable Vulci analysis rules shared with the
command-line interface rather than duplicate the rules.

**Result:** Future editor work remains visible without prematurely accepting an
architecture or duplicating language analysis.

## Phase 13 implementation split

**Decision**

The Struct language feature remains a single agreed language feature. Only its implementation is split.

### 13A — Struct definitions and construction

- Top-level struct declarations evaluating to `null`
- Struct type and constructor registration
- Name-collision and no-rebinding validation
- Struct types in every accepted type position
- Named-only struct construction
- Field defaults and their accepted scope restrictions
- Structural validation, evaluation order, type validation, and atomicity
- Empty structs, forward references, and nullable recursive-cycle validation
- Constructor-style printing

### 13B — Field access

- Member access
- Mutable field and nested-field assignment
- Value semantics and independent assignment copies

### 13C — Struct methods

- Method declarations and member-name uniqueness
- Method calls
- Implicit read-only `self` binding with mutable fields
- Temporary receivers and rejection of method-value access

### 13D — Remaining struct semantics

- Structural equality
- Recursive copy behaviour
- Anonymous-object incompatibility
- Stable struct, member, and `self` diagnostics

### 13E — Completion

- Lexer, parser, evaluator, diagnostic, and warning coverage
- Malformed syntax and edge cases
- Regression tests
- Smoke tests
- Documentation updates

Every implementation phase must leave the interpreter working and pass `npm run check` and `npm run coverage`.
