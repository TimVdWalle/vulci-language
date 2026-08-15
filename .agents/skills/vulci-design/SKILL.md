---
name: vulci-design
description: Audit and guide Vulci language design, comparisons, source-of-truth changes, implementation decisions, and next-phase kickoff prompts. Use for proposals about syntax, semantics, language features, philosophy alignment, comparisons with other languages, changes to files under project/, implementation work that changes language behavior, or requests to create a prompt for starting the next Vulci implementation phase.
---

<!-- Phase: Phase 16 collections -->

# Vulci Design

Protect the distinction between accepted Vulci decisions, undecided proposals, explanatory documentation, and implementation details.

## 1. Resolve authority

- Read `project/source_of_truth_index.md` completely before substantive analysis.
- Identify every active authoritative document relevant to the topic, including each document listed under `Also check`.
- Read all relevant general and domain-specific syntax and semantics documents. A rule may be distributed across more than one file.
- For implementation work, also read `project/implementation/implementation_phases.md` and `project/implementation/implementation_strategy.md` where relevant.
- Treat `project/documentation/language_documentation.md`, examples, tests, and implementation code as non-authoritative unless the index explicitly says otherwise.

## 2. Audit the proposal

- Split the proposal into atomic statements with short, stable IDs.
- Classify every statement as exactly one of:
  - `Agreed` — already recorded in its active authoritative source-of-truth document or explicitly approved by the user.
  - `Undecided` — not established by an active authority and not explicitly approved by the user.
- Cite the owning document or the user's explicit approval for each `Agreed` statement.
- Do not infer acceptance from examples, conventions, other languages, implementation code, tests, or apparent intent.
- Report contradictions between authorities separately; do not resolve them by guessing.

Use this compact audit shape:

| ID  | Statement | Status | Authority or reason |
| --- | --------- | ------ | ------------------- |

## 3. Evaluate the design

- Require every addition—including an idea, syntax rule, language feature, semantic rule, or anything else—to support one or more philosophies in `project/philosophies.md`, and evaluate it against `project/project_vision.md`.
- State which philosophy IDs the proposal supports and how.
- Challenge proposals when they may duplicate existing languages, fail to improve the language, add little practical value, contradict accepted decisions, or create avoidable design debt.
- Keep challenges proportionate. Explain the reasoning and offer relevant alternatives.

## 4. Choose the task path

### Design discussion

- Present the audit, philosophy analysis, weaknesses, and alternatives.
- Do not edit files unless the user requested edits and the source-of-truth gate below is satisfied.

### Source-of-truth creation or update

- Before creating or updating a source-of-truth document, produce an audit of every statement that would appear in the resulting document, including unchanged statements in an existing document, and classify each one as `Agreed` or `Undecided`.
- Wait for explicit user approval of the audit.
- After approval, update only the authoritative owner identified by the index and any other files the user explicitly requested.
- Preserve all unrelated text and accepted decisions verbatim.
- Never promote an `Undecided` statement into accepted language text.

### Language implementation

- Confirm every implemented behavior is `Agreed` in its authoritative source.
- Implement the smallest change required by the accepted behavior.
- If implementation, tests, examples, and authority disagree, stop and report the conflict rather than silently choosing one.
- Do not refactor unrelated code.

### Language comparison

- Unless the user specifies another comparison set, cover:
  - `cmp-ruby` — Ruby
  - `cmp-php` — PHP
  - `cmp-laravel` — Laravel
  - `cmp-java` — Java
  - `cmp-js` — JavaScript
  - `cmp-python` — Python
- Distinguish language comparisons from framework comparisons when that difference affects the conclusion.

### Next-phase kickoff prompt

When asked to create a prompt for starting the next implementation phase:

1. Resolve the target phase from the active `implementation-phases` document; do not infer it from numbering, versioning, or conversation summaries.
2. Audit the target phase against every relevant active truth document before drafting. Do not promote undecided details into the prompt's stated scope.
3. Produce one standalone, copyable prompt modelled on the established Vulci phase-kickoff format. Unless the user requests commentary, output the prompt in a single fenced `text` block.
4. Include the target phase ID, title, language-feature IDs, intended result, and accepted broad scope. State explicitly that detailed syntax and semantics must come from the truth files.
5. Make these the prompt's first required actions:
   - list exactly what the target phase will implement from the current truth files;
   - audit blockers and undecided items before planning or implementation.
6. Require the blocker audit to cover unresolved syntax, unresolved semantics, contradictions between truth files, unfinished dependencies, insufficiently specified implementation-plan requirements, and deferred decisions that affect the phase.
7. Require the agent to stop without inventing a solution when it finds a blocker, and to state explicitly when no blocker exists.
8. Route the agent through `project/source_of_truth_index.md` and every relevant active authority. Include general and domain-specific documents rather than assuming one file owns every rule.
9. Use `https://github.com/TimVdWalle/vulci-language` as the canonical public implementation repository. Require checking newer relevant branches and pull requests before treating `main` as current, and do not refer to the old `TimVdWalle/vulci` source URL.
10. Preserve existing names, APIs, structure, and unrelated behaviour. Forbid optional refactors and unrelated cleanup during the phase.
11. Require the applicable phase comment at the top of every delivered file, subject to required first-line constructs and file-format validity.
12. End the generated prompt by limiting the initial response to the scope list and blocker audit. Do not permit implementation planning or code changes until those steps are complete and blockers are resolved.
13. Mention an uploaded ZIP or archive only when the user's context establishes one. Otherwise refer generically to the provided workspace or `project/` truth files.
14. Include a release-version change only when an active authority or the user explicitly establishes the target version; do not derive it from the phase number.

## 5. Finish clearly

- State whether files were changed.
- If waiting for audit approval, say explicitly that no source-of-truth file has been changed.
- Give every option, issue, decision, and deliverable a short, stable ID.
