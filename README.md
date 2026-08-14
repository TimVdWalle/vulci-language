<!-- Phase: Phase 15B CLI, distribution, and quality hardening -->

Vulci

A general-purpose programming language designed from first principles.

Vulci is an attempt to build a programming language that genuinely deserves to exist.

The goal is not to create another language with a different syntax, nor to experiment for experimentation’s sake. The goal is to design a language whose overall design provides enough value that experienced developers can justify choosing it over existing alternatives.

Although Vulci is developed as a hobby project, it is designed with the ambition and discipline of a serious programming language. Development decisions may be pragmatic, but language design decisions are made as if Vulci were intended for long-term, real-world use.

⸻

Design Philosophy

Every significant language decision is evaluated against three core philosophies.

Phi1 — One mental model for working with data

Regardless of whether data comes from memory, files, databases, APIs, streams, or other sources, programmers should work with it through the same mental model.

Different data sources should not require fundamentally different programming models.

⸻

Phi2 — Code should be easy to read and unambiguous

Code is read far more often than it is written.

Vulci favors clarity, consistency, and explicit intent over cleverness or unnecessary brevity. Every construct should have one clear interpretation, avoiding hidden behavior and surprising language rules whenever practical.

⸻

Phi3 — Small building blocks, powerful combinations

Rather than introducing many specialized language features, Vulci aims to provide a small number of fundamental concepts that combine naturally into expressive solutions.

Complexity should emerge from composition, not from an ever-growing collection of language features.

⸻

Project Goals

The project distinguishes between the success of the project itself and the success of the language.

A successful project

The project should remain enjoyable, sustainable, and educational throughout its development.

A successful project is one that results in a complete programming language while providing an enjoyable opportunity to learn about language design, interpreter implementation, and the many trade-offs involved in creating a coherent language.

A successful language

The language succeeds only if it genuinely earns its place among existing programming languages.

Novelty alone is not enough. Vulci should justify its existence through the quality, consistency, readability, and usefulness of its overall design.

⸻

Design Principles

Some principles guide every language decision:

- Every feature should support one or more of the three philosophies.
- Features should justify their existence.
- Simplicity is preferred over feature count.
- Consistency is preferred over special cases.
- Temporary implementation constraints should not compromise the long-term language design.
- The implementation order does not imply the importance of a feature.

⸻

Name

The language is named Vulci, after the ancient Etruscan city of Vulci in present-day Italy.

The name was chosen while the project’s creator was on holiday near the archaeological site itself. It was selected because it is short, distinctive, memorable, easy to pronounce, and independent of any particular programming concept or implementation detail.

Source files currently use the extension:

.vci

Both the name and extension are accepted project decisions, although they may still evolve before a stable release.

⸻

Guiding Principle

A programming language should reduce the number of things a programmer needs to think about—not increase them.

If a language feature makes programs easier to understand, more consistent, and more expressive without increasing the programmer’s mental burden, it probably belongs in Vulci.

If it does not, it probably doesn’t.

⸻

Development

Install the project dependencies:

```bash
npm ci
```

Available development commands:

```bash
npm run dev         # Run the interpreter from source.
npm run build       # Compile the interpreter.
npm run build:executable # Build a standalone executable on macOS.
npm test            # Run the automated test suite.
npm run coverage    # Run the test suite with coverage reporting.
npm run smoke       # Run the end-to-end smoke test.
npm run check       # Run formatting, linting, type checking, tests, and the smoke test.
```

Building a standalone executable locally requires macOS and Node.js 22. The
build produces an executable for the Mac's current architecture in `artifacts/`.

CLI usage:

```bash
vulci --help
vulci --version
vulci .
vulci program.vci --tokens --ast
```

Phase 15B releases provide standalone executables for Apple Silicon and Intel
macOS. Once the Homebrew tap contains its generated formula, install Vulci with:

```bash
brew install TimVdWalle/vulci/vulci
```

Maintainers publish a release by pushing a tag matching the package version,
such as `v0.15.0`. The release workflow builds and tests both macOS executables,
publishes their checksums, and updates `TimVdWalle/homebrew-vulci`. The repository
secret `HOMEBREW_TAP_TOKEN` must contain a fine-grained token with contents write
access to that tap repository.

Before the first release, create the public `TimVdWalle/homebrew-vulci`
repository with an initial `main` branch, then add `HOMEBREW_TAP_TOKEN` to this
repository's Actions secrets. The first version tag will generate and commit the
tap formula automatically.
