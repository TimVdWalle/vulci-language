<!-- Phase: Phase 16 collections -->
<!-- Document ID: source-of-truth-index -->
<!-- Version: 2 -->
<!-- Status: Active -->
<!-- Authority: Routing and responsibility map for project documents -->
<!-- Supersedes: source-of-truth-index v1 -->

# Source-of-Truth Index

Resolve documents by their stable `Document ID` metadata. Filenames may vary
slightly between copies or revisions.

## Mandatory audit rule

Before a design discussion, inspect every active document whose responsibility
can affect the topic. General and domain-specific syntax or semantics may both be
relevant.

| Document ID               | Role                                                        | Also check                                          |
| ------------------------- | ----------------------------------------------------------- | --------------------------------------------------- |
| `project-vision`          | Project purpose, ambition, scope, governance, and success   | `language-philosophies`                             |
| `language-philosophies`   | Evaluation principles for significant decisions             | `project-vision`                                    |
| `naming-decisions`        | Language name and source extension                          | None unless naming affects another proposal         |
| `syntax-general`          | Accepted general syntax                                     | Relevant domain syntax and semantics                |
| `syntax-collections`      | Accepted string/collection syntax                           | `syntax-general`, `semantics-collections`           |
| `semantics-general`       | Accepted general semantics                                  | Relevant domain semantics and syntax                |
| `semantics-collections`   | Accepted string/collection semantics                        | `semantics-general`, `syntax-collections`           |
| `implementation-phases`   | Implementation order, dependencies, and completion criteria | Owning specifications and `implementation-strategy` |
| `implementation-strategy` | Reference-interpreter architecture and mechanics            | Owning semantics and `implementation-phases`        |
| `decision-register`       | Non-accepted, deferred, rejected, and superseded items      | The document that would own an accepted decision    |
| `wishlist`                | Non-authoritative capture list for unreviewed ideas         | Relevant owning authority and `decision-register`   |
| `language-documentation`  | User-facing explanation of the intended accepted language   | Owning syntax and semantics; not authoritative      |

## Wishlist rule

The Wishlist captures ideas and reminders without accepting them as language,
implementation, or phase decisions. Every wishlist entry remains undecided until
it passes the normal design process and is explicitly accepted in its owning
source-of-truth document. A wishlist entry does not authorize implementation.

## Ownership rule

Each accepted decision has one authoritative owner. Other documents may summarize,
reference, or use it as an implementation criterion, but must not become competing
authorities.
