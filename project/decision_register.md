<!-- Phase: Phase 18 counted loops -->
<!-- Document ID: decision-register -->
<!-- Version: 14 -->
<!-- Supersedes: decision-register v13 -->
<!-- Status: Active -->
<!-- Authority: Status and history of non-accepted, rejected, deferred, and superseded design items -->

# Decision Register

This document tracks design items that are not accepted language rules. Accepted
future features remain in their owning syntax or semantics specifications.

## Status meanings

- **Undecided:** no accepted decision exists.
- **Deferred:** still undecided and intentionally postponed.
- **Rejected:** explicitly not selected.
- **Superseded:** replaced by a later accepted decision.

# General syntax

- `dec-syn-001` — Compound assignment syntax — **Deferred**
- `dec-syn-002` — General loop syntax beyond collection `each`, integer `.times`,
  and condition-driven `while` — **Partially superseded** by those accepted loop
  forms; `do...while` and other general loop forms remain **Deferred**
- `dec-syn-003` — Match/switch syntax — **Deferred**
- `dec-syn-004` — Lambda syntax — **Deferred**
- `dec-syn-005` — General user-defined generic syntax — **Deferred**
- `dec-syn-006` — Error-handling syntax — **Deferred**
- `dec-syn-007` — Attributes and annotations — **Deferred**
- `dec-syn-008` — Visibility syntax — **Deferred**
- `dec-syn-009` — Hexadecimal, binary, and octal literals — **Deferred**
- `dec-syn-010` — Scientific notation — **Deferred**
- `dec-syn-011` — String interpolation — **Superseded** by the accepted Phase 10 `{{expression}}` interpolation syntax
- `dec-syn-012` — Function-reference syntax — **Undecided**
- `dec-syn-013` — Unary `+` — **Undecided**
- `dec-syn-014` — Enum syntax — **Superseded** by the accepted Phase 14 enum syntax in the General Syntax Specification
- `dec-syn-015` — Module/package syntax beyond the accepted transparent source-file imports — **Undecided**
- `dec-syn-016` — `~` precedence and associativity — **Superseded** by the accepted rule that `~` shares the left-associative `+`/`-` precedence level
- `dec-syn-017` — Multiline string indentation stripping details — **Superseded** by the accepted exact common-whitespace-prefix rule
- `dec-syn-018` — Phase 10 string and interpolation diagnostic codes — **Superseded** by the accepted short stable codes
- `dec-syn-019` — Numeric tuple-member access through `.` — **Superseded** by the accepted general bracket-indexing syntax
- `dec-syn-020` — Empty and one-member tuple literals — **Rejected**; tuple literals contain at least two members
- `dec-syn-021` — Typed index-binding syntax and empty-body syntax for integer
  `.times` loops — **Superseded** by the accepted untyped-only index binding and
  valid empty-body rules
- `dec-syn-022` — Loop-control syntax beyond bare `break`, including `continue`,
  break values, and labeled loop control — **Deferred**

The former broad entries “Object syntax” and “Class syntax” were stale and are
resolved by the accepted tuple, anonymous-object, struct, and class designs.

Enum associated-value syntax and enum raw or backing-value syntax are **Deferred**
to a future phase with no phase currently assigned. Adding either feature requires
a separate syntax-and-semantics decision and explicit source-of-truth approval.
Enum methods are likewise outside Phase 14 and remain **Deferred** without an
assigned phase. Enum pattern matching and exhaustiveness remain covered by the
existing deferred match/switch and pattern-matching entries.

# General semantics

- `dec-sem-001` — Decimal semantics — **Deferred**
- `dec-sem-002` — Recursive copying of compound values — **Partially superseded** for tuples, anonymous objects, structs, and collections by their accepted assignment-semantics and structural-reuse rules; remains **Undecided** for other future compound types. Enum value semantics are accepted separately in the General Semantics Specification
- `dec-sem-003` — Compound-value and class equality — **Partially superseded** for tuples, structs, and collections by their accepted equality rules; remains **Undecided** for anonymous objects, classes, and other future compound types. Enum equality is accepted separately in the General Semantics Specification
- `dec-sem-004` — Field mutability — **Superseded** by the accepted rules that anonymous-object fields are immutable and struct fields are mutable with value semantics; remains undecided only for future field-bearing types such as classes
- `dec-sem-005` — Field defaults and required/optional fields — **Partially superseded** for function parameters and struct fields by the accepted rules in the general semantics specification; remains **Undecided** for classes and future field-bearing types
- `dec-sem-006` — Struct/class construction validation and diagnostics — **Partially superseded** for structs by the accepted construction and diagnostic rules in the general semantics specification; remains **Undecided** for classes
- `dec-sem-007` — Member visibility and custom constructors — **Partially superseded** by the accepted struct member visibility and constructor rules; remains **Undecided** for future class-specific visibility features
- `dec-sem-008` — Class inheritance, overriding, and dispatch — **Undecided**
- `dec-sem-009` — Anonymous-object and struct compatibility — **Superseded** by the accepted rule that anonymous objects are not implicitly compatible with structs
- `dec-sem-010a` — Empty tuple representation — **Superseded** by the accepted rule that Vulci does not support empty tuples
- `dec-sem-010b` — Empty anonymous-object representation — **Rejected**; anonymous objects must contain at least one field
- `dec-sem-011` — Nested-function capture, rebinding, and closure lifetime — **Undecided**
- `dec-sem-012` — Default expressions depending on earlier parameters — **Deferred until `ph23` design**
- `dec-sem-013` — Invalid string member-call diagnostic categories — **Superseded** by the accepted general member and argument diagnostic codes
- `dec-sem-014` — Tuple-specific indexing diagnostic categories — **Rejected** in favour of shared general indexing diagnostics
- `dec-sem-015` — Remaining integer `.times` details — **Superseded** by the
  accepted receiver-evaluation, index-binding, result, control-flow, and
  diagnostic rules in the General Semantics Specification
- `dec-sem-016` — `continue`, break values, labeled loop targeting, and other
  advanced loop-control semantics — **Deferred**

# Collection syntax

- `dec-col-syn-001` — Exact `each` collection-expression and item-binding syntax — **Superseded** by the accepted receiver-attached, brace-delimited syntax and binding forms in the Collection Syntax Specification
- `dec-col-syn-002` — Safe collection-access syntax — **Undecided**
- `dec-col-syn-003` — Pattern-matching syntax for collection runtime types — **Deferred**
- `dec-col-syn-004` — Capabilities-system syntax — **Deferred**
- `dec-col-syn-005` — `.length` as a string/collection count alias — **Rejected** in favour of the accepted `count()` operation
- `dec-col-syn-006` — `.isList`, `.isSet`, and `.isMap` concrete-kind properties — **Superseded** by the accepted general `is Type` operator for concrete, typed, and broad collection type inspection
- `dec-col-syn-007` — Exact binding-and-block syntax for future `map`, `filter`,
  and related traversal operations — **Undecided**

Callback-style `each()` forms are **Superseded** by the accepted language-level,
brace-delimited `each` loop decision. Lambdas may later provide alternative
collection processing, but no replacement decision is accepted.

# Collection semantics

- `dec-col-sem-001` — Remaining `each` binding, result, map traversal, and early-termination semantics — **Superseded** by the accepted `each` rules in the Collection Semantics Specification
- `dec-col-sem-002` — Safe collection-access behaviour — **Undecided**
- `dec-col-sem-003` — Explicit unrestricted `map` boundary type — **Superseded** by the accepted `map<any, any>`, `map<any, V>`, and `map<K, any>` forms
- `dec-col-sem-004` — Collection conversion operations — **Undecided**
- `dec-col-sem-005` — Exact `map()` result semantics — **Undecided**
- `dec-col-sem-006` — Bulk additions and immutable update/removal operations — **Partially superseded** by the accepted initial `add()` and `remove()` operations; bulk additions and later index/key removal, replacement, and update operations remain **Undecided**
- `dec-col-sem-007` — Exact `reduce()` semantics — **Deferred until `ph29` design**
- `dec-col-sem-008` — Exact `group()` semantics — **Deferred until `ph30` design**
- `dec-col-sem-009` — Exact `any()` and `all()` semantics — **Undecided**
- `dec-col-sem-010` — Universal contextual `loop` details and nested-loop
  behaviour — **Partially superseded** by accepted ordinary nested `each`
  expressions, the accepted universal `loop` context, and its accepted `prev`
  and `next` member names. The exact additional fields (`index`, `iteration`,
  `isFirst`, `isLast`, `hasNext`, and `hasPrevious`); context mutability,
  reservation, shadowing, first-class use, lifetime, context resolution in
  nested loops, outer-loop access, and visibility to called functions; per-receiver `prev`
  and `next` meanings; boundary behaviour; navigation-capability checks;
  guarantees against implicit advancing or external fetching; unsupported-source
  behaviour remain **Undecided**. Implementation is **Deferred** beyond Phase 18;
  the exact future phase remains undecided
- `dec-col-sem-011` — Capabilities system details and boundary-type interaction — **Deferred**
- `dec-col-sem-012` — User-defined collection-capable types — **Deferred**
- `dec-col-sem-013` — Pattern-matching unmatched-case behaviour — **Deferred**
- `dec-col-sem-014` — Tuple map keys — **Deferred**; tuple equality is accepted, but tuple map-key eligibility and key semantics remain undecided
- `dec-col-sem-015` — Explicit collection mutability — **Deferred**

## DEC-STRUCT-IMPLEMENTATION-PHASING

Decision: The agreed Struct feature is implemented over implementation phases 13A–13E only for implementation planning. The language specification is unchanged.

Each implementation phase must be independently:

- compilable;
- testable;
- reviewable;
- shippable.
