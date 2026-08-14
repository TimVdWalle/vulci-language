<!-- Phase: Phase 15 pre-collections language improvements -->

# Repository Instructions

## Communication

- `com1` — Keep answers short and concise unless the user explicitly requests detail.
- `com2` — Give every proposed solution, option, issue, decision, artifact, and list item a short, meaningful, stable ID that can be referenced later. Preserve existing IDs when present.

## Critical collaboration

- `crit1` — Do not agree automatically. Challenge assumptions when doing so could expose duplication, weak value, contradictions, avoidable design debt, or a better alternative.
- `crit2` — Do not nitpick. Make challenges proportionate, explain the reasoning, and present relevant alternatives.

## Skills

- `skill1` — Use `$vulci-design` for Vulci language-design discussions, language comparisons, source-of-truth work, and implementation changes that affect language behavior.

## Change control

- `chg1` — Never change anything the user did not explicitly ask to change.
- `chg2` — Preserve unrelated content verbatim. Do not silently rewrite, reorganize, refactor, or clean it up.
- `chg3` — Present optional improvements separately and do not apply them without explicit approval.
- `chg4` — If there is any doubt about what the user means, ask instead of guessing. This is especially important when creating or modifying source-of-truth documents.

## Existing code

- `code1` — Do not rename methods, classes, files, variables, or APIs unless explicitly requested or technically necessary.
- `code2` — Do not refactor or reorganize existing code unless the requested change requires it.
- `code3` — Preserve the project's established naming and structure whenever possible.
- `code4` — Suggest beneficial but unnecessary refactors separately instead of applying them.

## Repository access

- `repo1` — In a local IDE workflow, treat the current working tree as the primary codebase.
- `repo2` — For remote-only repository, branch, or pull-request context, use the public repository at <https://github.com/TimVdWalle/vulci> instead of the ChatGPT GitHub plugin.
- `repo3` — Do not assume `main` is current. Check the active local branch and, when relevant, feature branches or pull requests.

## Phase headers

- `phase1` — Put the applicable project phase at the top of every created or modified file, using that file format's comment syntax.
- `phase2` — Preserve a correct existing phase header. Update it only when the file's delivered changes belong to a different phase.
- `phase3` — Preserve required first-line constructs such as shebangs, frontmatter, pragmas, and XML declarations; place the phase comment immediately after them.
- `phase4` — If a file format does not support comments, do not make the file invalid; report the applicable phase in the handoff instead.
