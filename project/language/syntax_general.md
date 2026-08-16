<!-- Phase: Phase 17 collection iteration -->
<!-- Document ID: syntax-general -->
<!-- Version: 30 -->
<!-- Status: Active -->
<!-- Authority: Accepted non-collection-specific Vulci syntax -->
<!-- Supersedes: syntax-general v29 -->

# General Syntax Specification

This document owns accepted general Vulci syntax. Collection-specific syntax is owned by the Collection Syntax Specification. Runtime behaviour and implementation staging are outside this document's authority.

---

# 1. Program Structure

## Blocks

### Decision

Blocks use braces.

```text
if (...) {
    ...
}
```

---

## Expression Orientation

Every executable Vulci construct is an expression.

This does not remove contextual placement restrictions. A construct that is
top-level-only remains top-level-only even though it evaluates to a value.
“Statement” describes an expression's placement or termination where that term
is used; it does not define a separate non-value-producing construct category.

---

## Entry Point

### Decision

Execution starts at the top level of the program's entry source file.
Additional source files are reached through top-level imports.

### Rationale

Avoid mandatory boilerplate for simple programs.

### Example

```text
print("Hello")
start
```

No `fn main` exists.

---

# 2. Statements

## Variable Creation

### Decision

Ordinary local variables are created by first assignment inside functions and
methods. No `let` or `var` is used.

```text
fn count_items() returns int {
    count = 1
    count = 2
    count
}
```

A variable exists only if execution reached its first assignment.

Every variable created at the top level must use the `$` global-variable prefix.
An ordinary unprefixed variable assignment at the top level is invalid.

```text
$count = 1 // valid
count = 1  // invalid at the top level
```

---

## Statement Terminator

### Decision

Statements end at a newline.

A newline does not end the current expression when the next non-empty line begins with a binary operator. The operator continues the expression from the preceding line.

Semicolons are not allowed.

### Valid

```text
x = 1
y = 2
print(x)

result = value
    + 2 * 3
    - 4
```

### Invalid

```text
x = 1;
```

---

# 3. Comments

Single-line:

```text
// comment
```

Multi-line:

```text
/*
comment
*/
```

Reason: keeps `#` available for possible future language features.

---

# 4. Literals

## Boolean

```text
true
false
```

## Null

```text
null
```

## String

Vulci uses `str` as the source-code type keyword. “String” is the ordinary
name for the same type in documentation and discussion.

### Single-Line Strings

Double-quoted strings support escape sequences and interpolation.

```text
name = "Alice"
message = "Hello, {{name}}"
```

Single-quoted strings support escape sequences but do not interpolate.
Interpolation-looking text remains literal.

```text
message = 'Hello, {{name}}'
```

Both forms produce ordinary `str` values. Quote style affects parsing only.

A raw line break between the opening and closing delimiters of a single-line
string is invalid. The `\n` escape inserts a newline into the resulting value.

### Escape Sequences

Both single-quoted and double-quoted strings support the same escape sequences:

```text
\n
\t
\r
\\
\"
\'
```

An unknown escape sequence is a syntax error.

### Multiline Strings

Triple double quotes create multiline strings with escapes and interpolation.

```text
text = """
Hello, {{name}}
World
"""
```

Triple single quotes create multiline strings with escapes but no interpolation.

```text
text = '''
Literal {{name}}
World
'''
```

Both multiline forms produce ordinary `str` values and support the same escape
sequences as their single-line forms.

When the opening delimiter is followed immediately by a newline, that boundary
newline is excluded. A newline immediately before the closing delimiter is also
excluded. Common indentation is stripped after boundary-newline removal. The exact whitespace
prefix shared by every non-empty, non-whitespace-only line is removed. Tabs and
spaces are distinct characters, and visual tab width is irrelevant. Whitespace-only
lines do not participate in prefix calculation. Remaining whitespace is preserved
verbatim. The indentation of the closing delimiter does not participate. This rule
is provisional and may be revised after evaluating real-world use.

### Interpolation

Interpolation uses `{{expression}}` and is available only in double-quoted
single-line and multiline strings.

```text
age = 42
message = "Your age is {{age}}"
```

The contained text must be a valid, non-empty Vulci expression. Interpolation
parsing tracks balanced nested brace pairs, so brace-using expressions may occur
inside it. An empty interpolation, an unclosed `{{`, or a closing `}}` without a
matching opening delimiter is a syntax error.

String-syntax diagnostics include a stable diagnostic code and a source location
when the parser can determine one. Their accepted codes are:

- `E_STR_ESC` — unknown escape sequence
- `E_STR_UNCLOSED` — unterminated string
- `E_STR_NL` — raw newline in a single-line string
- `E_IPL_EMPTY` — empty interpolation
- `E_IPL_CLOSE` — closing interpolation delimiter without a matching opening delimiter
- `E_IPL_UNCLOSED` — unterminated interpolation

Human-readable diagnostic wording may improve without changing the diagnostic's
identity.

## Numbers

Currently supported:

- Decimal integers
- Decimal floating point

Digit separators are allowed.

```text
1_000
1_000_000
3.141_592
```

Not currently supported:

- Hexadecimal
- Binary
- Octal
- Scientific notation

---

# 5. Operators

## Arithmetic

Binary integer arithmetic operators:

```text
+
-
*
/
%
```

Unary `-` negates an integer expression. Decimal integer literals do not
include a sign.

```text
-5
-value
-(1 + 2)
```

Consecutive unary-minus operators without parentheses are not allowed.
Parentheses must be used for repeated negation.

Valid:

```text
-(-5)
```

Invalid:

```text
--5
```

### Precedence

From highest to lowest:

1.  Parenthesized expressions
2.  Unary `-`
3.  `*`, `/`, `%`
4.  `+`, `-`, `~`

Parentheses may group arithmetic expressions and override normal precedence
and associativity.

```text
(1 + 2) * 3
```

### Associativity

All binary arithmetic operators, including `~`, are left-associative.

```text
20 / 5 / 2
```

is interpreted as:

```text
(20 / 5) / 2
```

## Comparison

```text
==
!=
<
<=
>
>=
value is Type
```

`is` is a reserved keyword and cannot be used as an identifier. Its right-hand
side is a Vulci type, not a value expression. Any type form accepted by Vulci
may be used there. Collection-specific type forms are defined by the Collection
Syntax Specification. Vulci does not have an `is not` operator; negate a type
test with `not`, for example `not (value is int)`.

### Precedence

All comparison operators have lower precedence than every arithmetic operator.

The six equality and ordering comparison operators share one precedence level.
`is` shares that precedence level but does not participate in chained
comparisons.

```text
1 + 2 < 4
```

is interpreted as:

```text
(1 + 2) < 4
```

### Chained Comparisons

From Phase 6 onward, an unparenthesized expression may contain multiple
comparison operators. Such an expression is a chained comparison.

A chained comparison may contain equality operators with equality operators.

```text
true == true != false
```

A chained comparison may contain ordering operators with ordering operators.

```text
1 < 2 <= 3
```

Equality and ordering comparison operators may not be mixed within one
unparenthesized chained comparison.

```text
1 < 2 == true
```

The preceding expression is invalid because it mixes ordering and equality
operators without parentheses.

`is` cannot be combined with another comparison operator in one
unparenthesized comparison expression.

```text
value is int == true
```

The preceding expression is invalid. Parentheses may make the two comparisons
explicit.

```text
(value is int) == true
```

Parentheses may likewise separate ordering and equality comparison expressions.

```text
(1 < 2) == true
```

## Logical

```text
and
or
not
```

Reason: Keyword operators improve readability.

`and`, `or`, and `not` are reserved keywords and cannot be used as
identifiers.

### Precedence

From highest to lowest:

1.  `not`
2.  `and`
3.  `or`

Every comparison operator has higher precedence than every logical operator.

```text
not a and b or c
```

is interpreted as:

```text
((not a) and b) or c
```

```text
1 < 2 and 3 < 4
```

is interpreted as:

```text
(1 < 2) and (3 < 4)
```

### Associativity

`and` and `or` are left-associative.

```text
a and b and c
```

is interpreted as:

```text
(a and b) and c
```

```text
a or b or c
```

is interpreted as:

```text
(a or b) or c
```

Repeated unparenthesized `not` operators are allowed.

```text
not not true
```

is interpreted as:

```text
not (not true)
```

Parentheses may group logical expressions and override normal precedence and
associativity.

```text
(true or false) and false
not (true and false)
```

## Assignment

Assignment uses `=`.

Assignment has lower precedence than every other expression operator and is
right-associative.

```text
a = b = 5
```

is interpreted as:

```text
a = (b = 5)
```

Assignment is valid anywhere an expression is valid.

Ordinary variable identifiers, `$`-prefixed global variable identifiers, and
member-access expressions that resolve to mutable struct fields are valid
assignment targets.

```text
name = "Alice"
$counter = 1
user.name = "Bob"
user.address.city = "Rome"
```

Anonymous-object fields remain immutable and therefore are not valid assignment
targets.

---

# 6. Function Calls

## Zero-argument Calls

Parentheses may be omitted.

Valid:

```text
start
exit
```

## Calls With Arguments

Parentheses are required.

```text
print("Hello")
resize(image, width: 100)
```

Invalid:

```text
print "Hello"
```

## Member Access

Uses `.`

```text
user.name
user.address.city
```

Function reference syntax is still undecided.

## Conditional Chain Steps

A method-call step in a chain may have a postfix `if` condition.

```text
users
    .filter(...) if (conditionA)
    .filter(...) if (conditionB)
```

The postfix `if` applies only to the method-call chain step immediately before
it. It is not accepted as general postfix-conditional syntax.

---

# 7. Compound Values and Named Types

## Positional Tuples

Positional tuple literals use parentheses and contain at least two members.

```text
point = (10, 20)
```

`()` is invalid. `(value)` is a parenthesised expression, not a tuple.
`(value,)` is invalid because Vulci does not support one-member tuples.

Tuples follow the general trailing-comma rule for comma-separated lists.

```text
point = (10, 20,)

point = (
    10,
    20,
)
```

Tuple members are accessed through the general bracket-indexing syntax. The
index may be any expression; its runtime value must be an integer.

```text
point[0]
point[1]
point[index]
point[1 + 0]
```

### Tuple Types

Tuple types use dedicated `tuple(...)` syntax and contain at least two member
types. Tuple types may appear anywhere an ordinary type annotation is accepted,
including parameter and return types.

```text
tuple(int, str)

fn swap(tuple(int, str) value) returns tuple(str, int) {
    (value[1], value[0])
}
```

Tuple types are positional. Nested tuple types and union types in member
positions are allowed. A complete tuple type may also participate in a union.

```text
tuple(tuple(int, int), str)
tuple(int|null, str)
tuple(int, str)|null
```

Tuple types follow the general trailing-comma rule for comma-separated lists.
`tuple()` and `tuple(int,)` are invalid because tuple types require at least two
member types. A bare `tuple` type does not exist.

`tuple(...)` is dedicated tuple-type syntax. It does not establish general
generic or collection-type syntax, and it is not valid tuple-value construction
syntax. Tuple values continue to use positional tuple literals such as `(10,
20)`.

---

## Anonymous Objects

Anonymous objects use `object(...)` and must contain at least one field.

```text
user = object(
    name: "Tim",
    age: 30
)
```

`object()` is invalid.

Anonymous-object fields use `name: value` syntax. Field names are identifiers
and must be unique within the same anonymous-object construction.

Anonymous-object construction follows the general trailing-comma rule for
comma-separated lists.

```text
user = object(
    name: "Tim",
    age: 30,
)
```

Anonymous-object fields are accessed through `.`. Chained member access is
allowed.

```text
user.name
user.address.city
```

Anonymous-object fields are immutable. Assignment to a field or nested field is
invalid.

```text
user.name = "Bob"          // invalid
user.address.city = "Rome" // invalid
```

---

## Struct Declarations

Struct declarations use `struct` followed by the type name and a braced body.
Struct declarations are top-level only.

```text
struct User {
    str name
    int age

    fn display_name() returns str {
        self.name
    }
}
```

Struct fields use `type name` syntax. Struct methods use the existing `fn`
syntax and access the current struct value through `self`.

A struct name introduces both a type name and a constructor name. It cannot be a
built-in type name and cannot also be used as a function, variable, parameter,
or another struct name in any scope.

A declared struct name may be written anywhere a type is accepted, including
field types, parameter types, return types, union members, and tuple member
types.

Field and method names must be unique across the complete struct body. Duplicate
fields, duplicate methods, and field-method name collisions are invalid.

---

## Struct Construction

Struct values use normal typed construction syntax.

```text
user = User(
    name: "Tim",
    age: 30
)
```

Construction uses named arguments only.

Construction fields use `name: value` syntax.

Field defaults are declared using `=`.

```text
struct User {
    str name
    int age = 18
}
```

---

## Enum Declarations

Enum declarations use the reserved keyword `enum`, followed by the enum type
name and a braced body. Enum declarations are top-level only and are available
throughout the source file, including before their textual declaration.

```text
enum Status {
    Pending
    Running
    Finished
}
```

An enum declaration must contain at least one member. Empty enum declarations
are invalid.

Enum members are bare names written one per line. Members do not use commas or
a `case` keyword. Phase 14 enum members do not accept associated values, raw
values, or backing values.

```text
enum Result {
    Success
    Failure
}
```

A declared enum name is a user-defined type name and may be written anywhere an
ordinary type is accepted, including parameter types, return types, union
members, tuple member types, and struct field types. Enum type names do not use
a special prefix.

```text
fn keep_status(Status status) returns Status {
    return status
}

fn optional_status(Status|null status) returns Status|null {
    return status
}
```

Enum values are referenced using qualified member access through the enum type
name.

```text
Status.Pending
```

Bare enum member references such as `Pending` are invalid. Enum value references
reuse the existing member-access expression syntax.

Pattern matching, `match`, `switch`, and exhaustiveness syntax are not introduced
in Phase 14.

---

## Class Declarations and Construction

Classes are declared with `class` and use the same field, method, and
construction syntax as structs.

```text
class Account {
    str owner
    int balance

    fn deposit(int amount) {
        self.balance = self.balance + amount
    }
}

account = Account(
    owner: "Tim",
    balance: 100
)
```

Class syntax is accepted for the language design but is implemented in a later
phase than tuples, anonymous objects, and structs.

---

## Braces

Bare braces remain executable-block syntax. Tuple and anonymous-object literals
do not use bare braces.

```text
{ expression }
```

---

# 8. Parameters & Arguments

## Rules

- Required parameters must appear before optional parameters.
- Named arguments are the default.
- Up to the first **two required** parameters may be supplied
  positionally.
- Optional parameters must always be named.
- Named arguments may appear in any order.
- Once a named argument is used, every following argument must also be
  named.
- Supplying the same parameter twice is invalid.

### Valid

```text
resize(image, 100, height: 200)
resize(image, height: 200, width: 100)
```

### Invalid

```text
resize(image, height: 200, 100)
resize(image, width: 100, width: 200)
```

Reason: Names improve readability once calls become larger.

---

# 9. Control Flow

## Scope

Control-flow bodies do not create general variable scopes. Explicit binding
positions provided by a control-flow construct may have a narrower lifetime
defined by that construct. Collection `each` binding scope is defined by the
Collection Syntax and Collection Semantics Specifications.

---

## Conditions

Parentheses are required.

```text
if (ready) {
}

while (running) {
}
```

## Else-if

```text
if (...) {
}
else if (...) {
}
else {
}
```

All `else` and `else if` placements are syntactically valid.

The following placements are preferred:

```text
} else {
```

```text
}
else {
```

```text
}
else
{
```

Any other whitespace or newline arrangement is valid but produces a non-fatal
style warning. Comments between the preceding `}` and `else` are valid but also
produce the warning. Indentation does not affect this warning.

Every explicitly written `if`, `else if`, and `else` branch must contain at
least one expression.

If no branch matches and no `else` branch exists, the expression evaluates to
`null`.

---

# 10. Functions

## Declaration

Function declarations use `fn`.

```text
fn add(a, b) {
}
```

Function bodies must contain at least one expression.

Functions create scopes.

Function declarations are top-level only. Nested function declarations are not
supported in Phase 7.

Duplicate function names in the same scope are invalid. Function overloading is
not supported in Phase 7. Functions, variables, struct constructors, and enum type names share one value
namespace, so they cannot use the same name. A declared struct or enum name also
cannot be used as a parameter name or rebound in a nested scope.

---

## Global Variables

Global variable identifiers use a `$` prefix. The prefix is part of the
identifier.

```text
$counter = 0
```

`counter` and `$counter` are distinct identifiers.

Global variables may only be created at the top level. Parameters cannot use
`$`-prefixed names. The `$` prefix applies to variables, not function names. `$` must be followed
by a valid ordinary identifier. `$`, `$2name`, and `$$name` are invalid.

Ordinary unprefixed variables may only be created inside functions and methods.

---

## Parameter Types

Parameter types are optional and appear before the parameter name.

```text
fn print(str message) {
}
```

Union types use `|`. Whitespace immediately before or after `|` is valid and
does not produce a warning. Duplicate union members are invalid. `any` cannot
appear inside a union. `null` may appear as a union member.

```text
fn print(str|int message) {
}
```

Typed parameters may have default values.

```text
fn print(any meta = null) {
}
```

Local variables do not have type annotations. Their types are inferred automatically.

---

## Return Types

Return types are optional and use `returns`.

```text
fn print(str message) returns null {
}
```

---

## Built-in Type Names

Currently accepted built-in type names:

```text
int
bool
str
list
set
map
collection
any
null
```

Declared struct and enum names are user-defined type names and may appear in
every type position accepted by Vulci. A struct or enum declaration cannot reuse
any built-in type name listed above.

`collection` follows the same contextual identifier rules as `list`, `set`, and
`map`; it is not a more strongly reserved keyword. Its accepted type positions
and type-argument rules are defined in the Collection Syntax Specification.

The syntax of built-in collection type arguments is defined in the separate
Collection Syntax Specification. General user-defined generic syntax is not yet
accepted; see `dec-syn-005` in the Decision Register.

---

## Implicit Return

The final evaluated expression becomes the return value.

```text
fn add(a, b) {
    a + b
}
```

## Explicit Return

`return` is syntactically allowed anywhere. A bare `return` is valid and
returns `null`. Using `return` outside a function is a semantic error.

Primarily intended for early exits.

```text
fn process(data) {
    if (invalid(data)) {
        return null
    }

    compute(data)
}
```

Code after an unconditional `return` in the same block is invalid.

There is no `noop` keyword.

When an implicit return of `null` is desired, use `null` as the final
expression.

---

# 11. Imports

`import` is a top-level statement whose operand names another Vulci source
file.

The imported path is written as a single-line, single-quoted string literal and
must include the `.vci` extension.

```text
import 'helpers.vci'
import './helpers.vci'
import 'users/validation.vci'
import '../shared/helpers.vci'
```

Import paths are relative. A path without `./` or `../` is valid and is relative
in the same way as an explicit `./` path. Absolute import paths are invalid.
Path segments use `/` in Vulci source on every platform.

Vulci does not infer the `.vci` extension from import syntax.

Imports are valid only at the top level. They are not valid inside functions,
methods, conditional branches, or other nested blocks.

All imports in a source file must form a leading top-level block. Once any
non-import top-level declaration or executable statement appears, no later
`import` statement is valid.

---

# 12. Formatting Rules

Every syntactic comma-separated list may contain one trailing comma. This
applies equally to single-line and multiline forms. A trailing comma does not
create an additional element. Empty comma elements and repeated trailing commas
are invalid.

---
