<!-- Phase: Phase 18 counted loops -->
<!-- Document ID: semantics-collections -->
<!-- Version: 14 -->
<!-- Status: Active -->
<!-- Authority: Accepted string and collection semantics -->
<!-- Supersedes: semantics-collections v13 -->

# Collection Semantics Specification

This document owns accepted semantics for strings as collection-capable scalar values and for collection value types. General semantics is owned by the General Semantics Specification. Syntax and implementation staging are outside this document's authority.

---

# 1. Collection-Capable Value Types

Vulci defines four distinct value types with collection capabilities:

- `string`
- `list`
- `set`
- `map`

Their accepted fundamental characteristics are:

| Type     |    Ordered iteration | Direct access | Uniqueness |
| -------- | -------------------: | ------------- | ---------- |
| `string` |                  Yes | Positional    | None       |
| `list`   |                  Yes | Positional    | None       |
| `set`    | Yes, insertion order | None          | Values     |
| `map`    |                  Yes | By key        | Keys       |

Iteration order is deterministic for all four types.

A `string` and a `list` support positional access.

A `map` supports direct access through its keys.

A `set` does not support bracket or positional access.

---

# 2. String Values

## Value Model

Strings are scalar text values with collection capabilities. `str` is the
source-code type keyword; “string” is the ordinary descriptive name for the same
type.

All accepted quote forms produce the same runtime `str` value. Quote style only
controls whether interpolation is enabled while parsing the literal.

A grapheme obtained from a string is represented as an ordinary `str`. Vulci
does not use a separate character type for string elements.

## Immutability

Strings are immutable.

## Indexed Access

String indexing operates on Unicode grapheme clusters.

String indexing is zero-based.

The index expression is evaluated exactly once and must produce an `int`.

Successful indexing returns the grapheme at that position as an ordinary `str`.

A non-integer index produces `IDX_TYPE`. A negative or out-of-range integer
index produces `IDX_RANGE`.

Safe indexed access remains undecided and is not an accepted operation.

## Indexed-Access Performance

Simple strings support O(1) indexed grapheme access.

Strings containing complex multi-code-point graphemes may require O(n) work on
the first indexed access.

An implementation may cache grapheme boundaries so later indexed access to the
same immutable string is O(1).

String concatenation must account for a grapheme potentially forming across the
concatenation boundary.

---

# 3. Collection Literals

Collection literals use the collection type name followed by brackets.

```text
list[1, 2, 3]
set[1, 2, 3]
map["a": 1, "b": 2]
```

Empty collection literals are valid.

```text
list[]
set[]
map[]
```

List and set element expressions are evaluated exactly once from left to right.
Every set element expression is evaluated, including expressions whose resulting
value duplicates an earlier member. The first equal value determines that
member's insertion position.

Map entries are processed exactly once from left to right. Within each entry, the
key expression is evaluated before the value expression. Immediately after the
key is evaluated, its map-key eligibility and duplication are validated using
normal map-key identity. Only after both validations succeed is that entry's
value expression evaluated.

If evaluating any collection-literal expression fails, later expressions are not
evaluated. An ineligible or duplicate map key produces its runtime error without
evaluating that entry's value or any later entry.

---

# 4. Local Collection Values

Local variables do not restrict the types of values contained by a collection.

```text
items = list[1, "hello", true]
```

An empty local collection is unrestricted.

```text
items = list[]
```

---

# 5. Collection Types at Function Boundaries

Collection item types are expressed at function boundaries.

```text
fn process(list<int | str> items) {
    ...
}
```

```text
fn create_items() returns list<int | str> {
    return list[1, "hello"]
}
```

The equivalent collection type forms are:

```text
list<T>
set<T>
map<K, V>
```

Union types may be used within collection type arguments.

When a collection enters a typed function parameter, its contents are checked
against the declared collection type before the function body executes.

When a function returns a collection through a declared collection return type,
its contents are checked against that declared type before control returns to the
caller.

A bare collection type is allowed at a function boundary and denotes an
unrestricted collection, but it emits a warning because its contained types are
unspecified.

```text
fn process(list items) {
    ...
}
```

The same rule applies to bare `set` and `map` boundary types.

The accepted explicit unrestricted forms are `list<any>`, `set<any>`, and
`map<any, any>`. A map may also leave only one side unrestricted through
`map<any, V>` or `map<K, any>`, where the other argument is any otherwise
accepted type. Explicit unrestricted forms do not emit a warning. `any` remains
invalid as a member of a union.

An unrestricted map type does not relax map-key eligibility. Every actual map
key must still use an accepted map-key type.

## Broad `collection` Boundary Type

`collection` is a broad runtime boundary type that accepts any recognized
collection value without requiring a specific concrete collection type.

```text
fn do_something(collection values) {
    ...
}
```

A function may also declare `collection` as its return type.

```text
fn create_values() returns collection {
    return list[1, 2, 3]
}
```

`collection` currently includes `list`, `set`, and `map`.

`string` is not a `collection`, although strings may share explicitly accepted
operations with collection types.

Distinct value types may share consistently named operations where those
operations make sense. The exact future capabilities-system design remains
undecided and is not required for shared operations.

Passing or returning a value through a `collection` boundary does not convert or
erase its concrete runtime type. Type-specific behaviour continues to depend on
the actual runtime collection type.

At function entry, a `collection` boundary checks only that the value is a
`list`, `set`, or `map`. An operation unsupported by the concrete runtime type
produces a runtime error only when execution reaches that operation. Untaken
code paths do not produce that error.

The general `is Type` operator uses the same collection type-matching rules as
function-boundary validation. A bare `list`, `set`, or `map` type matches a value
of that concrete collection type without restricting its contained types. A
typed collection form such as `list<int>`, `set<int>`, or `map<str, int>` matches
only when the concrete collection type matches and every contained value or map
entry satisfies the declared type arguments. The broad `collection` type matches
`list`, `set`, and `map` values and does not match strings or non-collection
values.

The explicit unrestricted forms use the same matching rule with `any` accepting
every contained value in its position. Concrete runtime collection types are
inspected only through the general `is Type` operator. The properties `isList`,
`isSet`, and `isMap` are not accepted.

Pattern matching for runtime type handling is deferred to a later phase.

---

# 6. Immutability

`list`, `set`, and `map` values are immutable.

Collection operations do not mutate an existing collection value.

The initially accepted immutable update operations are:

- `list.add(value)` appends the value and returns a new list.
- `set.add(value)` adds the value when absent and returns a new set.
- `map.add(key, value)` adds an absent key-value pair and returns a new map.
- Strings do not support generic `add()`.
- `list.remove(value)` removes the first equal value and returns a new list.
- `set.remove(value)` removes the matching member and returns a new set.
- Maps do not remove by value.
- An unsuccessful `remove()` returns an unchanged equivalent collection.

Existing nested immutable values may be structurally reused. A collection
operation creates a new outer collection but does not require deep-copying
nested collections.

Collection literals and update operations retain their contained values according
to each value's normal runtime assignment semantics. Value-semantic tuples,
anonymous objects, and structs therefore remain independent values, while future
reference-semantic values retain their reference semantics. Accessing a contained
value follows those same assignment semantics. Collection immutability does not
deep-freeze a future reference-semantic value stored inside a collection.

`map.add(key, value)` requires an eligible key that is absent under normal map-key
identity. An existing key produces a duplicate-key runtime error even when the
existing and supplied values are equal. A successfully added key is placed last
in map insertion order; `map.add()` never replaces an existing value.

Explicit mutability may be introduced in a later phase, potentially through a
`mutable` language feature. No such feature is currently accepted.

---

# 7. Printing

Collections use deterministic compact literal-like printing:

```text
list[1, 2, "hello"]
set[1, 2, 3]
map["a": 1, "b": 2]
list[]
set[]
map[]
```

Lists print in list order, sets in insertion order, and maps in key insertion
order. Items and entries are separated by a comma followed by one space. Map keys
and values are separated by a colon followed by one space. Output is single-line
and has no trailing comma.

Nested collections are printed recursively. Other nested values use their normal
accepted printed representation. A `str` nested inside a collection uses a
double-quoted representation. Backslash, double quote, newline, tab, and carriage
return are escaped as `\\`, `\"`, `\n`, `\t`, and `\r` respectively. Directly
printing a top-level `str` continues to output its contents without quotes.

Printing a value that entered a function through the broad `collection` type uses
the value's concrete runtime collection form.

---

# 8. Direct Access

Strings, lists, and maps use bracket access.

```text
text[0]
items[0]
lookup["name"]
```

String and list indexes are zero-based.

Invalid positional access produces a runtime error.

Accessing a missing map key produces a runtime error.

A successfully accessed list item or map value is produced according to that
value's normal runtime assignment semantics.

Safe access remains a separate undecided operation or syntax.

Sets do not support bracket access or positional access.

---

# 9. Map Keys

The initially valid map-key types are:

- `string`
- `int`
- `bool`
- enum values

Map-key eligibility applies to keys used in map literals, keyed access,
`map.contains()`, and `map.add()`. Supplying an ineligible key to one of these
operations produces a runtime error. Explicit `any` in a map boundary type does
not relax this rule.

Future enum map-key identity uses the normal enum equality identity: both the
declaring enum type and member must match. For example, `Status.Pending` and
`PaymentState.Pending` are distinct keys. Phase 14 establishes this identity but
does not implement maps or enum map-key operations; actual map-key support remains
part of Phase 16.

The following are not initially valid map keys:

- decimals
- `null`
- collections
- tuples
- other complex values

Tuple equality is accepted, but tuple keys remain a potential future feature.
They may be considered only after tuple map-key eligibility and key semantics
have been explicitly accepted.

---

# 10. String Binary Operations

## Concatenation

`str + str` concatenates both string values and produces a new string. Both
operands must be strings; no implicit conversion occurs. Grapheme boundaries
are recalculated across the concatenation boundary.

## Space Join

`str ~ str` produces a new string containing the left value, exactly one ASCII
space, and the right value. Both operands must be strings; no implicit conversion
occurs.

Existing leading and trailing whitespace is preserved. The operator still
inserts one space when either operand is empty.

---

# 11. Equality and Ordering

Strings use value equality through the existing `==` and `!=` operators.
Two strings are equal when they contain the same Unicode code-point sequence.
String equality does not perform Unicode normalization, and `!=` is the inverse
of `==`.

Strings support `<`, `<=`, `>`, and `>=`. Ordering is lexicographic over Unicode
code-point sequences, case-sensitive, and performs neither Unicode normalization
nor locale-specific collation. Both operands must be strings; mixed or unsupported
types produce a runtime type error.

Collections use structural equality through the existing `==` and `!=`
operators.

Vulci does not introduce `===` for collection identity.

The accepted structural comparison rules are:

- Lists are equal when they contain structurally equal values in the same
  order.
- Sets are equal when they contain the same structurally equal members,
  regardless of iteration order.
- Maps are equal when they contain the same structurally equal key-value
  pairs, regardless of entry order.
- Nested collections are compared recursively.

---

# 12. Duplicate Values and Keys

A set cannot contain duplicate values.

Duplicate values in a set literal collapse into one value. The first occurrence
determines the value's iteration position.

A map cannot contain duplicate keys, but its values may be duplicated.

Duplicate keys in a map literal produce a runtime error.

---

# 13. Accepted Collection Operation Semantics

## `contains`

- `string.contains(value)` accepts only a string and performs exact,
  case-sensitive substring matching over Unicode code-point sequences. It
  performs no Unicode normalization and no implicit conversion.
- `list.contains(value)` checks whether an equal value occurs.
- `set.contains(value)` checks whether an equal member exists.
- `map.contains(value)` checks map keys.
- `map.containsValue(value)` is deferred to a later phase.

List, set, and map membership checks use Vulci equality.

## `filter`

`filter()` preserves the input kind:

- string to string
- list to list
- set to set
- map to map

String filtering traverses Unicode grapheme clusters. A `filter()` callback must
return a boolean. Map callbacks may receive `(value)` or `(value, key)`.

## `find`

`find()` searches in traversal order and returns the first matching value. A map
`find()` returns the matching value, not its key or entry. When no value matches,
`find()` returns `null`. Its callback must return a boolean.

## `count`

`count()` is a function and accepts no callback. For strings, it counts Unicode
extended grapheme clusters according to Unicode Standard Annex #29. An
implementation may use the Unicode version supplied by its runtime or Unicode
library. For other collection-capable values, it returns the item count for
lists, member count for sets, and entry count for maps.

---

# 14. String Interpolation

Interpolation evaluates its contained expression using ordinary Vulci
semantics. No implicit conversion occurs while that expression is evaluated.
This includes the existing rule that a bare identifier resolving to a function
is invoked with zero arguments.

After evaluation completes, the final result may be converted for insertion
only when it is one of these types:

- `str`: insert the string contents directly.
- `int`: insert the decimal representation.
- `bool`: insert exactly `true` or `false`.
- enum value: insert the member name exactly as declared, without the declaring
  enum type name. For example, `OrderStatus.PendingApproval` inserts
  `PendingApproval`.

Any other final result type produces a runtime type error. The conversion applies
only to the final interpolation result and does not introduce implicit
conversion within the expression.

Interpolation inserts the converted result without printing it and without
adding a newline.

## String Diagnostics

Unknown escapes, unterminated single-line strings, unterminated multiline
strings, raw line breaks inside single-line strings, empty interpolation,
unmatched interpolation delimiters, and unclosed interpolation are errors.
Diagnostics include a stable diagnostic code and a source location when the
implementation can determine one. The accepted codes are:

- `E_STR_ESC` — unknown escape sequence
- `E_STR_UNCLOSED` — unterminated single-line or multiline string
- `E_STR_NL` — raw line break inside a single-line string
- `E_IPL_EMPTY` — empty interpolation
- `E_IPL_CLOSE` — closing interpolation delimiter without a matching opening delimiter
- `E_IPL_UNCLOSED` — unterminated interpolation
- `E_IPL_TYPE` — unsupported final interpolation result type

Invalid member calls use these general runtime diagnostic codes:

- `E_MEM_TYPE` — the receiver type does not support the requested member
- `E_MEM_UNKNOWN` — the receiver type supports members, but the requested member does not exist
- `E_ARG_COUNT` — wrong number of arguments
- `E_ARG_TYPE` — wrong runtime argument type

These member-call codes are general-purpose and are reusable by later value types.
Human-readable diagnostic wording may improve without changing a diagnostic's
identity.

## Deferred String Operations

String slicing, repetition, and safe indexed access are not accepted operations.
Safe-access design remains deferred.

---

# 15. `each` Traversal

`each` is a language-level loop over a collection-capable value.

`each` is not a callback operation and does not depend on lambdas or function
values.

## Receiver Evaluation and Eligibility

The receiver expression is evaluated exactly once before receiver validation or
traversal. The resulting value is both the value traversed and, after normal
completion, the result of the `each` expression. If receiver evaluation fails,
no binding or body execution occurs.

`each` currently accepts every value matched by the broad `collection` type and
also accepts `str`. Its current receiver types are therefore `list`, `set`,
`map`, and `str`. Additional receiver types may be accepted in the future, but no
other type is currently eligible.

An ineligible receiver produces `E_MEM_TYPE`. No binding or body execution and
no later operation chained after `each` occurs.

## Traversal and Bound Values

The body executes once for every traversed item. Traversal uses the evaluated
receiver's defined traversal order. Operations evaluated as part of the receiver
may therefore determine a different traversal order before `each` begins; `each`
does not claim the receiver's original construction or insertion order beyond
the ordering guarantees of that evaluated value.

The bound values are:

- `str`: each Unicode grapheme cluster as an ordinary `str`, in string order;
- `list`: each item in list order;
- `set`: each member in the set's defined traversal order;
- `map`: each value, optionally followed by its key, in the map's defined
  traversal order.

A one-binding map form binds the value. A two-binding map form binds value first
and key second.

An empty receiver performs zero body executions.

## Binding Values and Types

Before each body execution, the item and optional key bindings receive the
current values according to those values' normal runtime assignment semantics.
`each` does not introduce special deep-copying. Value-semantic values therefore
remain independent values, while future reference-semantic values retain their
normal reference semantics.

Reassigning an item or key binding changes only that loop binding for the current
iteration. It does not replace or otherwise mutate the value stored in the
receiver.

An untyped binding is unrestricted and emits no warning. An explicitly typed
binding is validated against the current item or key before that iteration's body
executes. On a mismatch, that body execution, all later iterations, and later
chained operations do not occur; the runtime type error propagates normally.

Reassignment of an explicitly typed binding follows the accepted typed-parameter
reassignment rules. Each map binding is validated independently when typed.

## Binding Scope and Lifetime

Item and key bindings are visible only inside their `each` body. They are
populated with the current values before every body execution and do not exist in
the receiver expression or after the `each` expression. These rules do not decide
future closure-capture identity.

An item or key binding may not reuse the name of an already-visible unprefixed
local variable, parameter, or enclosing loop binding. Duplicate names in a map's
two-binding form are therefore invalid. A `$`-prefixed global and an unprefixed
loop binding remain distinct identifiers.

At the top level, an unprefixed item or key name is valid because it is a
temporary loop binding, not a global variable.

The `each` body does not create a general variable scope. Assignments other than
the declared item and key bindings follow the existing scope rules. Inside a
function or method, they may therefore create or update surrounding local
variables. At the top level, ordinary variable assignment still requires a
`$`-prefixed global name.

## Result and Chaining

After ordinary completion or a `break` targeting the `each` loop, `each`
evaluates to its unchanged receiver value. The result of each individual body
execution is discarded. The same receiver result is produced for an empty
receiver and for an empty body.

Because `each` produces its receiver, it is not terminal: later operations may be
chained after its body. Those operations execute after ordinary completion or a
`break` targeting the `each` loop.

If evaluation exits through `return` or a runtime error, the `each` expression
does not complete normally and no later chained operation executes.

## Control Flow

A `return` executed inside an `each` body immediately exits the enclosing
function or method under the ordinary return rules. Remaining iterations are not
executed. `return` at the top level remains invalid.

A runtime error in the body immediately stops traversal and propagates normally.

A bare `break` targeting the `each` loop immediately stops traversal. The `each`
expression then produces its unchanged receiver under the result and chaining
rules above. A `break` consumed by a nested loop does not stop the enclosing
`each` traversal.

`continue`, break values, and labeled loop control remain deferred.

## Nested `each`

An `each` body may contain another `each` expression. Every nested expression
follows the same receiver, traversal, binding, result, and control-flow rules
independently. Because binding shadowing is invalid, nested loops use distinct
binding names.

Nested-loop behaviour beyond ordinary independent nesting and the accepted
innermost-loop `break` targeting remains deferred.

---

# 16. Ordering After Transformations

- `filter()` preserves traversal order.
- `list.add()` appends at the end.
- A new `set.add()` member is placed last in insertion order.
- Removal preserves the relative order of remaining values.
- Maps preserve existing key order; newly added keys are placed last.

---
