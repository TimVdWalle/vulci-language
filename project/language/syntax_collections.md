<!-- Phase: Phase 16 collections -->
<!-- Document ID: syntax-collections -->
<!-- Version: 11 -->
<!-- Status: Active -->
<!-- Authority: Accepted string- and collection-specific Vulci syntax -->
<!-- Supersedes: syntax-collections v10 -->

# Vulci Collection Syntax Specification

This document owns accepted syntax specific to strings and collections. General syntax is owned by the General Syntax Specification. Collection behaviour and implementation staging are outside this document's authority.

---

# 1. Collection Literals

## List Literals

List literals use `list[...]`.

```text
items = list[1, 2, 3]
empty = list[]
```

## Set Literals

Set literals use `set[...]`.

```text
values = set[1, 2, 3]
empty = set[]
```

## Map Literals

Map literals use `map[...]`. Entries use `key: value` syntax.

```text
lookup = map[
    "a": 1,
    "b": 2
]

empty = map[]
```

---

# 2. Collection Types at Function Boundaries

## Typed Collection Parameters and Returns

Collection item types use angle-bracket type arguments where function
parameter or return types are already permitted.

```text
fn process(list<int|str> items) {
}

fn create_items() returns list<int|str> {
    list[1, "hello"]
}
```

Sets use one item type. Maps use a key type followed by a value type.

```text
set<int>
map<str, int>
```

Union types may be used inside collection type arguments.

```text
list<int|str>
map<str, int|null>
```

`any` may be used as a complete collection type argument. The accepted explicit
unrestricted forms are:

```text
list<any>
set<any>
map<any, any>
map<any, V>
map<K, any>
```

`K` and `V` above stand for any otherwise accepted type form. `any` remains
invalid as a member of a union.

These accepted built-in collection type arguments do not establish general
user-defined generic syntax. General user-defined generic syntax remains
deferred under `dec-syn-005` in the Decision Register.

## Bare Collection Types

Bare collection types are syntactically valid at function boundaries.

```text
fn process(list items) {
}
```

The warning and unrestricted-type meaning of a bare collection type are
semantic rules defined in the Collection Semantics Specification.

## Broad `collection` Type

The built-in type name `collection` may be used as a function parameter or
return type without naming a concrete collection type.

```text
fn do_something(collection values) {
}

fn create_values() returns collection {
    list[1, 2, 3]
}
```

Its membership and runtime behaviour are defined in the Collection Semantics
Specification.

`collection` may also appear on the right-hand side of the general `is Type`
operator. It does not accept type arguments; forms such as `collection<any>` are
invalid. It follows the same contextual identifier rules as `list`, `set`, and
`map`.

---

# 3. Runtime Collection Type Inspection

Collection runtime types are inspected with the general `is Type` operator
defined by the General Syntax Specification. Accepted collection type forms may
appear on its right-hand side.

```text
values is list
values is set<int>
values is map<str, int>
values is collection
```

The properties `isList`, `isSet`, and `isMap` are not accepted syntax.

---

# 4. Indexed and Keyed Access

Strings and lists use bracket syntax for positional access. Maps use bracket
syntax for keyed access. Sets do not support bracket or positional access.

```text
text[0]
items[0]
lookup["name"]
```

The behavior of invalid positional access and missing map keys is defined in
the Collection Semantics Specification.

---

# 5. `each` Loop Form

`each` is a language-level collection loop, not a callback operation.

It uses a brace-delimited executable body, like conditional expressions. The body
is executed once for every traversed item.

```text
each ... {
    ...
}
```

The exact collection-expression and item-binding syntax is not yet accepted; see
`dec-col-syn-001` in the Decision Register.

---

# 6. String Operation Syntax

Accepted string operation syntax includes:

```text
left + right
left ~ right
text.contains(value)
text.count()
left == right
left != right
left < right
left <= right
left > right
left >= right
```

`+` concatenates two strings. `~` joins two strings with one ASCII space. `~`
shares the precedence level of binary `+` and `-`, and operators at that level are
left-associative. Parentheses are recommended for readability when `+` and `~`
are mixed in one expression, but they are not required by the syntax.
`contains(value)` and `count()` use ordinary method-call syntax. Strings also
support the ordinary equality and ordering operators. `.length` is not an
accepted synonym; strings use `count()` consistently with collections.

String indexing uses the accepted bracket syntax shown above. String slicing and
repetition are not accepted.

---

# 7. Collection Operation Names

Accepted collection operation names include:

```text
collection.contains(value)
collection.filter(...)
collection.find(...)
collection.count()
collection.map(...)
collection.reduce(...)
collection.group(...)
collection.any(...)
collection.all(...)
map.containsValue(value)
collection.removeAll(...)
```

Initially accepted immutable update syntax includes:

```text
listValue.add(value)
setValue.add(value)
mapValue.add(key, value)
listValue.remove(value)
setValue.remove(value)
```

Exact syntax remains authoritative only where explicitly specified in this
document. Implementation order belongs to the Implementation Phases document.

---

# 8. Trailing Commas

Trailing commas are valid in list, set, and map literals.

```text
list[
    1,
    2,
]

set[
    1,
    2,
]

map[
    "a": 1,
    "b": 2,
]
```

---
