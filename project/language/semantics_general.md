<!-- Phase: Phase 15 pre-collections language improvements -->
<!-- Document ID: semantics-general -->
<!-- Version: 25 -->
<!-- Status: Active -->
<!-- Authority: Accepted non-collection-specific Vulci semantics -->
<!-- Supersedes: semantics-general v24 -->

# Programming Language Semantics Specification

This document owns accepted general Vulci semantics. String and collection semantics are owned by the Collection Semantics Specification. Syntax and implementation mechanics are outside this document's authority.

---

# 1. Local Variables

Ordinary unprefixed variables are local variables and may only be created inside
functions and methods. An ordinary unprefixed assignment at the top level is
invalid.

## Type Inference

Local variables do not declare a type. Their type is inferred automatically.

## Dynamic Typing

Local variables are dynamically typed and may later hold a value of another
type.

---

# 2. Function Parameters

## Omitted Parameter Type

When a parameter type is omitted, its type is `any`.

## Parameter Reassignment

A parameter declared with a union type may be reassigned, but only to values
belonging to one of the types in that union.

A parameter declared with a single explicit type cannot change type. A parameter
declared as `any` may be reassigned to a value of any type.

Function arguments are evaluated from left to right. Duplicate parameter names
are invalid. A function call with too few or too many arguments is invalid and
is reported when the call executes in the Phase 7 interpreter. Parameter types
are checked at function-call entry, before the function body executes.

---

# 3. Function Return Types

## Omitted Return Type

When a function return type is omitted, its return type is `any`.

A declared return type is checked before control returns to the caller. The check
applies to explicit `return value`, bare `return`, and the implicit final-expression
return. Every possible return path must be allowed by the declared return type.
A possible `null` result therefore requires a return type that includes `null`.

---

# 4. `any` Warnings

Explicit `any` does not produce a warning. Implicit `any` produces a warning
stating that the omitted type is treated as `any`.

Warnings use the label `warning:`. Their meaning must remain clear without
relying on terminal colour.

Each affected omitted parameter type declaration and omitted return type
declaration emits its own warning. A declaration warning is emitted once and is
not repeated when the function is called.

For an omitted parameter type, the warning points to the parameter name. For an
omitted return type, the warning points to the function name.

Warnings do not cause execution failure or change the successful process exit
status. Warnings are enabled by default.

---

# 5. Integer Values

## Integer Type

Vulci has its own `Integer` value type.

The representation used by a particular implementation does not define the
semantics or final range of Vulci integers.

The final range of the `Integer` type remains unspecified.

---

# 6. Integer Arithmetic

## Operand Types

Binary arithmetic operators and unary `-` require `Integer` operands.
Arithmetic operators do not perform implicit type conversions. Using another
value type produces a runtime type error.

## Result Type

Every successful binary arithmetic operation and unary negation produces an
`Integer` value.

## Division

Integer division truncates toward zero.

```text
5 / 2    // 2
-5 / 2   // -2
5 / -2   // -2
```

Division by zero produces a runtime error.

## Remainder

Remainder uses truncating-division semantics. Its result has the same sign as
the dividend unless the result is zero.

```text
-5 % 2   // -1
5 % -2   // 1
-5 % -2  // -1
```

Remainder by zero produces a runtime error.

---

# 7. Phase 2 Type Inference

In Phase 2, a local variable's current type is inferred at runtime from the
value assigned to it. No separate semantic-analysis or static type-inference
pass is required in Phase 2.

---

# 8. Arithmetic Errors

Runtime arithmetic errors report the source location of the relevant operator.

---

# 9. Boolean Values

## Boolean Type

Vulci has Boolean values `true` and `false`.

## Printed Representation

Printing Boolean values outputs exactly `true` and `false`.

---

# 10. Comparisons

## Result Type

Every successful comparison produces a Boolean value.

## Equality

When the operands of `==` or `!=` have different runtime types, the
comparison is valid: `==` produces `false` and `!=` produces `true`, unless a
more specific accepted equality rule applies. A runtime-type mismatch does not
produce an equality error.

For operands of the same runtime type, accepted equality semantics exist for
`Integer` values, Boolean values, `str` values, `null`, tuples, and enum values.
Struct equality is defined with the struct semantics below. Collection equality
is defined by the Collection Semantics Specification. Value kinds whose
same-type equality semantics are still undecided are not defined by this
cross-type rule.

Two strings are equal when they contain the same Unicode code-point sequence.
String equality performs no Unicode normalization.

`null == null` is `true` and `null != null` is `false`. When exactly one operand
is `null`, `==` produces `false` and `!=` produces `true`, regardless of the
other operand's runtime type. Comparing `null` with a non-null value does not
produce a mixed-type equality error.

Two tuples with different arity are unequal. Two tuples with the same arity are
equal only when every corresponding member is equal under the normal Vulci
equality rules. Tuple comparison is recursive, so nested tuples follow the same
rule. Corresponding members with different runtime types are unequal under the
general cross-type equality rule. If a member comparison is invalid for a value
kind whose same-type equality semantics are not accepted, the tuple comparison
produces that normal equality error rather than silently treating the members as
unequal.

Two enum values are equal only when both their declaring enum type and member
match. Enum values from different enum types are unequal even when their member
names match.

Different runtime types are unequal by default. Where an accepted equality rule
defines more specific nominal or structural behaviour, that rule takes
precedence. Enum equality accepts values from different enum types and produces
`false` for them. For every valid equality comparison, `!=` is the inverse of
`==`.

Equality operators do not perform implicit type conversions.

## Type Inspection with `is`

`value is Type` evaluates to a Boolean value. It is `true` exactly when the
runtime value would satisfy `Type` under Vulci's normal type-validation rules,
and `false` otherwise. The operator does not perform implicit conversion.

The right-hand side is a type, not a runtime expression. `any` therefore matches
every value, `null` matches only the null value, unions match when the value
satisfies at least one member type, and declared struct, enum, and tuple types
use their existing type-matching rules. Collection-specific type matching is
defined by the Collection Semantics Specification.

An unknown type name is an error rather than a `false` result and follows the
existing rule that unknown type names are reported as early as Vulci can
reliably determine that they do not exist.

## Ordering

The `<`, `<=`, `>`, and `>=` operators accept either two `Integer` operands or
two `str` operands.

String ordering is lexicographic over Unicode code-point sequences. It is
case-sensitive and performs neither Unicode normalization nor locale-specific
collation.

Mixed operand types or unsupported operand types produce a runtime error.
Ordering operators do not perform implicit type conversions.

---

## Chained Comparisons

A chained comparison has mathematical chaining semantics.

```text
1 < value <= 10
```

has the same comparison meaning as:

```text
1 < value and value <= 10
```

A chained comparison may contain only equality operators or only ordering
operators. The two categories may not be mixed within one unparenthesized
chain.

Parenthesized comparison expressions are evaluated separately and may then
participate in another comparison, subject to the ordinary operand-type rules.

Each operand is evaluated once, from left to right. Evaluation stops after the
first false comparison.

---

# 11. Comparison Errors

Invalid comparison diagnostics report the source location of the comparison
operator.

Equality type errors use this message format, with the actual operator
substituted:

```text
Operator '==' requires operands of the same type.
```

Ordering type errors use this message format, with the actual operator
substituted:

```text
Operator '<' requires two integers or two strings.
```

An invalid operand type within a chained comparison is reported at the exact
failing comparison operator.

Chained-comparison operand type errors use this message format, with the actual
operator substituted:

```text
Invalid operand type in chained comparison: operator '<' requires integer operands.
```

---

# 12. Logical Operators

## Operand Types

The `and`, `or`, and `not` operators require Boolean operands.

Logical operators do not perform implicit type conversions. Using another
value type produces a runtime type error.

## Result Type

Every successful logical operation produces a Boolean value.

## Boolean Negation

`not true` produces `false`.

`not false` produces `true`.

## Evaluation Order

Logical operands are evaluated from left to right.

The left operand of `and` or `or` is evaluated and type-validated before the
right operand. If the left operand has an invalid type, evaluation fails
immediately and the right operand is not evaluated.

## Short-Circuit Evaluation

The `and` operator evaluates its right operand only when its left operand is
`true`.

When the left operand of `and` is `false`, the right operand is not evaluated
and the result is `false`.

The `or` operator evaluates its right operand only when its left operand is
`false`.

When the left operand of `or` is `true`, the right operand is not evaluated and
the result is `true`.

A skipped right operand is not runtime-type-validated.

When the right operand is evaluated, it must be Boolean.

---

# 13. Logical Operator Errors

Invalid logical-operand diagnostics report the source location of the logical
operator.

Binary logical-operator errors identify whether the invalid operand is the
left or right operand and include only that operand's actual runtime type.

Invalid left-operand errors use this message format, with the actual operator
and runtime type substituted:

```text
Operator 'and' requires boolean operands, but the left operand is integer.
```

Invalid right-operand errors use this message format, with the actual operator
and runtime type substituted:

```text
Operator 'or' requires boolean operands, but the right operand is integer.
```

Invalid `not` operand errors use this message format, with the runtime type
substituted:

```text
Operator 'not' requires a boolean operand, but the operand is integer.
```

Runtime type names in logical-operator diagnostics are lowercase. The accepted
runtime type names currently relevant to these diagnostics are `integer` and
`boolean`.

A skipped right operand produces no diagnostic.

---

# 14. Conditional Expressions

An `if` expression does not require an `else` branch.

If no branch matches and no `else` branch exists, the conditional expression
evaluates to `null`. An omitted `else` therefore adds `null` as a possible
result type.

The final expression in the selected branch is the value of the conditional
expression. Every explicitly written branch must be non-empty.

Conditional expressions require Boolean conditions. Vulci does not use
truthiness or implicit conversion to Boolean values.

A non-Boolean `if` or `else if` condition produces this runtime diagnostic:

```text
Conditional expression requires a Boolean condition.
```

The diagnostic reports the source location of the relevant `if` or `else if`
keyword.

A non-preferred `else` or `else if` placement produces this non-fatal style
warning:

```text
Non-preferred 'else' placement.
```

The warning points to the relevant `else` keyword. It does not prevent parsing
or evaluation, does not change the program result, and does not change the
successful process exit status. Comments between the preceding `}` and `else`
produce this warning. Indentation does not affect it.

Conditions are checked in order. Only the selected branch is evaluated, and
unselected branches produce no values, errors, or side effects.

Different branches may produce values of different runtime types. A typed
context must allow every possible branch result.

`null` is a literal value and is introduced in Phase 6. `print(null)` outputs
`null`. `null == null` is `true` and `null != null` is `false`. Comparing `null`
with a non-`null` value is valid: `==` produces `false` and `!=` produces `true`,
without implicit conversion.

---

# 15. Assignment Expressions

Assignment is an expression and evaluates to the assigned value.

Assignment has the lowest expression precedence and is right-associative.

Assignment may appear anywhere an expression may appear. At this stage, only
ordinary variable identifiers and `$`-prefixed global variable identifiers are
valid assignment targets.

An assignment directly used as an `if` or `else if` condition produces a
non-fatal warning. An additional pair of parentheses around the assignment
explicitly marks it as intentional and suppresses that warning.

---

# 16. Functions and Scope

Top-level function declarations are available throughout the source file,
including before their textual declaration. Direct recursion and mutual recursion
are allowed.

A function declaration evaluates to `null`. This decision must be reevaluated
when first-class or anonymous functions are designed.

Duplicate function names in the same scope are invalid. Function overloading is
not supported in Phase 7, but may be reconsidered later. Functions, variables, struct constructors, and enum type names share one value
namespace, so they cannot use the same name. A struct declaration introduces its
name as both a type and a constructor. An enum declaration introduces its name as
a user-defined type and as the qualifier used to access its members. A declared
struct or enum name cannot be rebound as a variable or parameter in any scope.

Vulci uses lexical scope.

A `$name` identifier always refers to a top-level global variable. `$name` and
`name` are distinct identifiers.

Every variable created at the top level must use a `$`-prefixed identifier.
Ordinary unprefixed variables may only be created inside functions and methods.

Functions may read and write existing global variables through `$name`. A
function cannot create an undeclared global variable. Global variables must be
created at the top level.

The `$` prefix applies to variables, not function names. Inside a function, an
ordinary identifier is local and a `$`-prefixed identifier is global. Reading a
local variable before assignment is invalid and is reported as early as Vulci can
reliably determine it. `$` must be followed by a valid ordinary identifier.

Function bodies must be non-empty. The final evaluated expression is the implicit
return value. A bare `return` returns `null`. Code after an unconditional `return`
in the same block is invalid.

Using `return` outside a function is a semantic error.

An ordinary bare identifier resolves in the shared value namespace. If it
resolves to a variable, the identifier evaluates to that variable's value. If
it resolves to a function, the function is invoked with zero arguments. This
rule applies in every expression position.

A parenthesized call resolves its target name in the same shared value namespace.
If it resolves to a struct constructor, the struct-construction rules apply.
Calling an unresolved name produces an undefined-function runtime error:

```text
Undefined function 'name'.
```

Calling a name that resolves to a non-function value produces a non-function
runtime error:

```text
Cannot call 'name': value is not a function.
```

Bare invocation of a function with required parameters produces the normal
missing-required-argument error. Bare identifiers do not produce function
references. First-class function values remain unsupported. Callable validation
must remain localized so that later first-class-function semantics can replace
or extend it.

Host stack exhaustion during function execution must be converted into a Vulci
runtime error. JavaScript or TypeScript error details and host stack traces must
not be exposed to the user. The diagnostic identifies the Vulci function whose
invocation encountered the overflow:

```text
Maximum function call depth exceeded while calling 'functionName'.
```

For mutual recursion, the reported function is the function being invoked when
the host reports stack exhaustion.

Unknown type names are reported as early as Vulci can reliably determine that
they do not exist.

---

# 17. Type Error Diagnostics

Type errors involving typed parameters, arguments, default values, and function
returns include the relevant function or parameter context, the expected type,
the received runtime type, and the source location.

Exact punctuation and final command-line formatting are implementation details.

---

# 18. Default Parameters

A parameter with a default value is optional. Optional arguments must be named.

A default expression is evaluated each time its argument is omitted. It is not
evaluated when the caller supplies that argument.

A default expression may reference top-level global variables through `$name`
and may call available functions. It may not reference any parameter or
function-local variable. A parameter reference in a default expression is a
semantic error when the function declaration is processed.

Default values may use normal expressions, including conditional expressions,
but assignment expressions are forbidden anywhere inside a default expression.

When a typed argument is omitted, its default expression is evaluated and the
result is then checked against the parameter type. When the caller supplies the
argument, the default is neither evaluated nor type-checked for that call.

---

# 19. Conditional Chain Steps

A method-call step in a chain may have a postfix `if` condition.

The current receiver is evaluated first. The step condition is then evaluated
and must produce a Boolean value, following the ordinary condition rules.

When the condition is `true`, the method call executes and its result becomes
the receiver for the next chain step.

When the condition is `false`, the method call is skipped and the previous
receiver continues through the chain unchanged. A skipped method call produces
no value, error, or side effect of its own.

Chain steps and their conditions are processed from left to right.

This rule applies only to method-call chain steps. Conditional property access,
conditional indexed access, and general postfix conditionals are not accepted.

---

# 20. Compound Value and Class Semantics

## Positional Tuples

Tuples are anonymous fixed-length compound values whose members are identified
by position. A tuple contains at least two members.

Tuple member expressions are evaluated from left to right.

Tuples use value semantics. Assigning a tuple creates an independent tuple
value. Each member is copied according to the normal assignment semantics of
that member's runtime type. Nested value types therefore retain value semantics,
while reference-type members retain their reference semantics.

Tuple members are accessed through the general bracket-indexing operation. The
index expression is evaluated normally and must produce an integer. Tuple
indexes are zero-based. Negative indexes are invalid, and an index outside the
existing member range produces a runtime error.

General indexing diagnostics are shared across indexable value types:

- `IDX_TARGET` — the target value does not support indexing
- `IDX_TYPE` — the index value is not an integer
- `IDX_RANGE` — the integer index is outside the valid range

Tuple literals reuse the ordinary parser diagnostics for malformed
comma-separated expressions and missing delimiters; they do not introduce
separate tuple-literal syntax codes.

Printing a tuple writes its members inside parentheses, separated by a comma and
one space. Each member uses its normal printed representation. Nested tuples are
printed recursively.

```text
(10, 20)
((1, 2), 3)
```

Tuples support structural equality through `==` and `!=` under the comparison
rules defined above.

Tuples cannot declare methods and cannot inherit.

### Tuple Types

Tuple types are structural and positional. Tuple arity is part of the type, and
each member position has its own declared type.

A tuple value matches a tuple type only when the tuple has the same arity and
every member matches the declared type at the corresponding position. Nested
tuple types are checked recursively.

The existing union-type matching rules apply to union types used as tuple member
types and to unions containing a complete tuple type. Parameter and return-type
validation use these tuple-matching rules.

`any` remains the way to accept a value whose tuple shape is intentionally
unconstrained. No separate runtime meaning or type-matching rule exists for a
bare `tuple` type.

## Anonymous Objects

Anonymous objects are anonymous fixed-shape compound values whose fields are
identified by name. An anonymous object contains at least one field.

Field names within one anonymous object must be unique. A duplicate field name
is a compile-time error.

Anonymous-object field expressions are evaluated exactly once, from left to
right. If evaluating one field fails, later field expressions are not evaluated.

Anonymous objects use value semantics. Assigning an anonymous object creates an
independent anonymous-object value. Each field is copied according to the normal
assignment semantics of that field's runtime type. Nested value types therefore
retain value semantics, while reference-type fields retain their reference
semantics.

Anonymous-object fields are immutable after construction. Assignment to an
anonymous-object field, including a nested field, is invalid.

Printing an anonymous object uses compact Vulci construction syntax. Fields are
printed in declaration order, separated by a comma and one space. Each field
value uses its normal printed representation. Nested anonymous objects are
printed recursively.

```text
object(name: "Tim", age: 30)
object(name: "Tim", address: object(city: "Rome"))
```

Anonymous-object and general member-access diagnostics use these codes:

- `E_OBJ_EMPTY` — an anonymous object contains no fields
- `E_OBJ_DUP` — an anonymous object contains a duplicate field name
- `E_MEM_UNKNOWN` — the requested field or method does not exist
- `E_MEM_TYPE` — the target value does not support member access

Anonymous objects cannot declare methods and cannot inherit.

Anonymous objects are intended for anonymous, one-off values. Named reusable
object types are provided by structs. Anonymous objects are not implicitly
compatible with structs, even when their fields match. A value satisfies a
struct type only when it has that declared struct type.

## Structs

Structs declare reusable named, data-focused value types with named fields.

A struct declaration evaluates to `null`.

A struct declaration introduces the same name as both a user-defined type and a
constructor. Struct names must be unique, cannot redefine a built-in type name,
and cannot conflict with a function, variable, or another struct constructor.
Once declared, the name cannot be rebound as a variable or parameter in any
scope.

A declared struct name is valid everywhere Vulci accepts a type, including
struct fields, function and method parameters, function and method return types,
union members, and tuple member types.

All member names within one struct must be unique across fields and methods.
Duplicate fields, duplicate methods, and field-method name collisions are
invalid. Method overloading is not supported.

Structs use value semantics. Assigning a struct value creates an independent
struct value.

Struct fields are mutable. Fields may be assigned both inside and outside
struct methods.

Structs may declare methods. A struct method automatically receives an
implicit `self` binding referring to the receiver value.

`self` is a read-only binding and cannot be reassigned. The fields of `self`
may be modified.

A struct method mutates the receiver on which it was invoked. Copies of a
struct remain independent according to value semantics.

`self` is a normal value of the struct type and may be passed to functions,
returned, assigned, printed, and compared.

Struct methods may call other methods on `self`.

Method calls on temporary struct values are allowed. Any mutation applies to
the temporary value, which is discarded unless a returned value is used.

Reading a method as a function value is not supported. Methods may only be
invoked directly using member-call syntax. Support for method values is
deferred until first-class function values are introduced.

Struct equality compares the declared struct type and then compares every
field recursively using the normal equality rules. Methods are ignored.

Printing a struct uses constructor syntax. The struct name is included, fields
are printed in declaration order, nested values use their own printing rules,
and methods are never printed.

Struct construction uses named arguments.

Construction validates structurally before evaluating any expressions.

Construction validation requires:

- every required field is supplied exactly once;
- optional fields may be omitted;
- unknown fields are rejected;
- duplicate fields are rejected.

Explicit field expressions evaluate from left to right.

Default field expressions are evaluated after explicit arguments, in field
declaration order.

Default expressions are evaluated separately for each construction.

A field default may use normal expressions, reference top-level global variables
through `$name`, call available functions, and construct available structs. It
may not reference `self`, another field, a constructor argument, a caller-local
variable, or a parameter. Assignment expressions are forbidden anywhere inside
a field default.

Supplying an explicit value suppresses evaluation of that field's default.

Every constructed field value must satisfy its declared type.

Construction is atomic. If any validation or evaluation step fails, no
partially constructed struct value is produced.

Struct declarations may be empty.

Forward references between top-level struct declarations are allowed.

Recursive struct declarations are allowed only when every direct or indirect
recursive cycle contains at least one field whose declared type explicitly
includes `null`.

Struct and `self` diagnostics use these stable codes:

- `E_STRUCT_DUP` — a struct name is duplicated or conflicts with a built-in
  type, function, variable, or struct constructor
- `E_STRUCT_MEMBER_DUP` — a field or method name conflicts with another member
  in the same struct
- `E_STRUCT_FIELD_MISSING` — a required construction field is omitted
- `E_STRUCT_FIELD_UNKNOWN` — an unknown construction field is supplied
- `E_STRUCT_FIELD_DUP` — a construction field is supplied more than once
- `E_STRUCT_FIELD_TYPE` — a constructed field value does not satisfy its
  declared type
- `E_STRUCT_RECURSION` — a direct or indirect recursive cycle has no explicitly
  nullable field
- `E_SELF_CONTEXT` — `self` is used outside a struct method
- `E_SELF_ASSIGN` — the `self` binding is reassigned directly

General member access continues to use `E_MEM_UNKNOWN` and `E_MEM_TYPE`.

Structs cannot inherit.

## Enums

Enums declare reusable named value types that model closed sets of named
alternatives.

An enum declaration evaluates to `null`. Top-level enum declarations are
available throughout the source file, including before their textual declaration.

An enum declaration must contain at least one member. Empty enum declarations are
invalid.

An enum declaration introduces its name as a user-defined type and as the
qualifier used to access its members. Enum type names participate in the existing
shared namespace. They must be unique, cannot redefine a built-in type name, and
cannot conflict with a function, variable, struct constructor, or another enum.
Once declared, an enum name cannot be rebound as a variable or parameter in any
scope.

A declared enum name is valid everywhere Vulci accepts a type, including struct
fields, function and method parameters, function and method return types, union
members, and tuple member types.

Enum members exist only within their declaring enum and are resolved through
qualified access such as `Status.Pending`. Bare member names are not introduced
into the surrounding scope. Member names must be unique within one enum.

Phase 14 enum members do not carry associated values and do not have raw or
backing values.

Every enum value retains both the identity of its declaring enum type and the
identity of its member. Enum identity is nominal. Members with the same name in
different enum declarations are distinct values.

Enums use value semantics. Assignment and parameter passing preserve the enum
type identity and member identity. Reassigning one enum variable does not affect
another.

Enum values support `==` and `!=`. Two enum values are equal only when both their
declaring enum type and member match. Enum values of different enum types are
therefore unequal, even when their member names match.

Enum values do not support `<`, `<=`, `>`, or `>=`. They also do not support
arithmetic operators, logical operators, unary numeric operators, or implicit
numeric or string conversion.

Enum values are not Boolean values and cannot be used directly as conditions.
They may be compared explicitly to produce a Boolean condition.

Printing an enum value produces its qualified form, such as `Status.Pending`.
String interpolation of enum values is defined by the Collection Semantics
Specification.

An enum-typed parameter or return value requires a value of the exact declared
enum type. Enum types may appear in unions and follow the existing union matching
and duplicate-member rules.

Enum values are non-null by default. An enum-typed value may be `null` only when
its declared type explicitly includes `null`. No implicit null member is added to
an enum. A programmer-declared member such as `Unknown` is an ordinary enum value
and is distinct from `null`.

Enum values have no instance fields or methods in Phase 14.

Phase 14 does not introduce pattern matching, `match`, `switch`, or exhaustiveness
checking for enums.

Invalid enum uses produce clear diagnostics. Existing diagnostics are reused when
their accepted meaning precisely covers the failure. Enum-specific diagnostics
use these stable codes:

- `E_ENUM_DUP` — an enum name is duplicated or conflicts with a built-in type,
  function, variable, struct constructor, or another enum
- `E_ENUM_MEMBER_DUP` — an enum contains the same member name more than once

Unknown enum members use the existing `E_MEM_UNKNOWN` diagnostic. Ordinary
syntax, type, operator, argument, return, and unsupported-member failures reuse
their existing diagnostics where those meanings fit.

Phase 14 adds no enum-specific warnings. Unused enum declarations and unused enum
members do not produce new warnings.

## Classes

Classes declare reusable named, identity-focused reference types with named
fields.

Class instances use reference semantics and have identity. Assigning a class
instance shares the same instance rather than creating an independent value.

Classes may declare methods and may inherit.

Class semantics are accepted for the language design but are implemented in a
later phase than tuples, anonymous objects, and structs.

---

# 21. Source Files and Imports

A Vulci program begins with one entry source file. Additional source files become
part of the program only when execution reaches a top-level `import` statement.
Every source file places all of its imports before any non-import top-level
declaration or executable statement. Once a non-import top-level item appears,
a later import is invalid. The runtime does not scan the entry file's directory
for additional Vulci files.

A source-file boundary does not create a module or namespace. Imported files use
the same existing program namespaces as the importing file.

When execution reaches an import, Vulci resolves the literal path relative to
the directory containing the importing source file. `helpers.vci` and
`./helpers.vci` therefore resolve from the same directory, while `../` resolves
from the parent directory. The literal path is used exactly: Vulci does not infer
the `.vci` extension, search for a module or package with the same name, or scan
directories for source files.

The imported file is then processed as part of the same program. Before its
top-level execution begins, its top-level function, struct, and enum declarations
become available under the same rules as other declarations in that program.
Those declarations retain their normal forward availability within the imported
file. Top-level code in the imported file then executes from top to bottom. When
it finishes, execution continues with the statement after the import in the
importing file.

Declarations that exist only in an imported file become available when that
import is processed. Imports later in the same leading import sequence have not
yet contributed their declarations. Global variables created by imported
top-level code are ordinary program globals and exist only after execution
reaches their creating assignment, under the normal global-variable rules.

Imported files may themselves import other source files. Vulci does not track
whether a file was previously imported and does not perform duplicate-import or
cycle detection. Reaching the same import again processes the file again. Normal
name-collision rules and normal top-level side effects therefore apply again.

Import depth is measured on the active import chain. The entry file has depth
`0`. Imported files may be entered through depth `64`; attempting to enter an
imported file at depth `65` produces an import-depth error and stops execution.
The depth safeguard does not otherwise change repeated-import behaviour.

Running an entry file whose top level contains only declarations runs no
executable top-level expressions.

---
