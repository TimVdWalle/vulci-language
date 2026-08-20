<!-- Phase: Phase 15B CLI, distribution, and quality hardening -->

# How to Release Vulci

Use this file when publishing a normal release or when a release fails.

For the one-time repository connection and token instructions, use the separate
[Homebrew connection guide](HOMEBREW_CONNECTION.md).

Labels such as `RELEASE-3` are just names for the steps. They help identify
exactly where a problem occurred.

## `SETUP` — One-time GitHub configuration

The automated workflow requires a dedicated user or GitHub App token. GitHub
intentionally holds pull-request checks for approval when the built-in
`GITHUB_TOKEN` creates or updates a pull request, which cannot support this
unattended release flow.

1. `SETUP-TOKEN-1` — In GitHub account settings, create a fine-grained personal
   access token for only `TimVdWalle/vulci-language`.
2. `SETUP-TOKEN-2` — Give it repository permissions **Actions: Read and write**,
   **Contents: Read and write**, and **Pull requests: Read and write**.
3. `SETUP-TOKEN-3` — In this repository, open **Settings → Secrets and variables
   → Actions**, create the repository secret `RELEASE_TOKEN`, and paste the
   token as its value.
4. `SETUP-ACTIONS-1` — Open **Settings → Actions → General**.
5. `SETUP-ACTIONS-2` — The older **Allow GitHub Actions to create and approve
   pull requests** setting may remain enabled, but the release workflow no
   longer relies on it.
6. `SETUP-MERGE-1` — Keep at least one pull-request merge method enabled.
   Squash merge is preferred; the workflow otherwise uses rebase or merge.
7. `SETUP-RULES-1` — Required status checks are supported. A rule requiring a
   human review must either exempt this release workflow or be removed, because
   a fully automatic release cannot supply a separate human approval.
8. `SETUP-BREW-1` — Keep the existing `HOMEBREW_TAP_TOKEN` configured as
   described in the [Homebrew connection guide](HOMEBREW_CONNECTION.md).

## `RELEASE` — Publish a new version with one workflow run

Merge every code, documentation, and feature change into `main` through its own
pull request before starting a release. The automated release pull request may
change only mechanical release files: currently `package.json`,
`package-lock.json`, and `src/version.ts`.

### `RELEASE-1` — Start the workflow

1. `RELEASE-START-1` — Open the
   [Release version workflow](https://github.com/TimVdWalle/vulci-language/actions/workflows/release-version.yml).
2. `RELEASE-START-2` — Select **Run workflow** and keep the branch set to
   `main`.
3. `RELEASE-START-3` — Enter the version without `v`, such as `0.18.0`.
4. `RELEASE-START-4` — Select **Run workflow**. No later approval, merge, local
   command, or second workflow run is required.

The target must be exactly one permitted stable SemVer step. From `0.19.0`, the
only valid versions are `0.19.1`, `0.20.0`, and `1.0.0`. Skipped versions,
older versions, and prerelease syntax are rejected. Repeating the current
version is accepted only as a strictly validated recovery attempt.

### `RELEASE-2` — Automated readiness and release pull request

The workflow performs these guarded operations:

- `RELEASE-GATE-1` — Requires the selected workflow branch and current remote
  branch to be `main`.
- `RELEASE-GATE-2` — Requires every version source to agree and the requested
  version to be one permitted next step.
- `RELEASE-GATE-3` — Waits up to 30 minutes for Checks on the exact current
  `main` commit. A failed check stops the release.
- `RELEASE-GATE-4` — Rejects conflicting release pull requests, tags, releases,
  or unexpected files.
- `RELEASE-GATE-5` — Creates or safely recovers `release/v<version>`, updates
  only the three release files, and opens the pull request. After rebasing an
  existing release branch, it waits up to two minutes for GitHub's pull-request
  head to synchronize. A legacy PR authored by `github-actions[bot]` is closed
  and replaced once under `RELEASE_TOKEN` so it cannot retain an
  approval-required check.
- `RELEASE-GATE-6` — Runs formatting, linting, type checks, tests, smoke tests,
  and coverage through the genuine pull-request `Checks` run after the version
  update.
- `RELEASE-GATE-7` — Shows cancellation instructions and waits two minutes
  after all release-PR checks pass.
- `RELEASE-GATE-8` — Rechecks the open pull request, exact head commit, and
  unchanged `main`, then merges the pull request automatically.
- `RELEASE-GATE-9` — Reruns Checks on the merged commit before creating its
  immutable annotated tag.

### `RELEASE-CANCEL` — Stop an accidental release

Before the release pull request merges, either action is sufficient:

1. `RELEASE-CANCEL-1` — Open the workflow run and select **Cancel workflow** in
   the upper-right; or
2. `RELEASE-CANCEL-2` — Open the generated release pull request and select
   **Close pull request**.

The workflow summary and pull-request body repeat these instructions. The
workflow never enables persistent auto-merge, and it verifies that the pull
request is still open immediately before merging. On workflow cancellation, it
also attempts to close the unmerged pull request and delete its generated
branch. After the pull request has merged, cancellation cannot undo already
completed work.

### `RELEASE-3` — Automated publishing and recovery

After merging, the same initiating run creates or validates the release tag,
builds both macOS executables, publishes the GitHub Release, and updates the
Homebrew tap. The initiating run is green only when every destination succeeds.

Starting `Release version` again with the same version safely resumes a release
that already merged but failed later. Recovery requires the matching merged
release pull request, unchanged `main`, an identical immutable tag when present,
and valid existing GitHub Release assets. It never moves a tag or overwrites a
conflicting release.

### `RELEASE-4` — Wait for the initiating run

Wait until these jobs are green in the same `Release version` run:

- `RELEASE-JOB-1` — `Prepare and merge release`
- `RELEASE-JOB-2` — `Checks`
- `RELEASE-JOB-3` — `Build macOS arm64`
- `RELEASE-JOB-4` — `Build macOS x64`
- `RELEASE-JOB-5` — `Publish GitHub Release`
- `RELEASE-JOB-6` — `Update Homebrew tap`

### `RELEASE-5` — Verify GitHub and Homebrew

Check the [GitHub Releases page](https://github.com/TimVdWalle/vulci-language/releases).
The new release should contain:

- `RELEASE-ASSET-1` — One ARM64 executable and its checksum file.
- `RELEASE-ASSET-2` — One Intel executable and its checksum file.

Check that the [Homebrew formula](https://github.com/TimVdWalle/homebrew-vulci/blob/main/Formula/vulci.rb)
contains the new version.

Then test through Homebrew:

```bash
brew update
brew upgrade vulci
vulci --version
brew test TimVdWalle/vulci/vulci
```

If Vulci is not installed yet, use this instead of `brew upgrade`:

```bash
brew install TimVdWalle/vulci/vulci
```

The version printed by `vulci --version` must be the version you released.

## `RELEASE-LOCAL` — Maintainer fallback

The existing local two-stage command remains available for diagnosing or
recovering automation problems:

```bash
npm run release -- 0.18.0
```

On a clean synchronized `main`, the first run creates the version pull request.
After manually merging it, running the same command again validates `main` and
pushes the tag. This fallback requires an authenticated GitHub CLI and is not the
normal release path.

## `RELEASE-RULES` — Important rules

- `RULE-MAIN` — Tag only after the release commit is merged into `main`.
- `RULE-PR` — Keep the mechanical version update visible in its own pull
  request; the guarded `Release version` workflow may merge that pull request
  automatically.
- `RULE-NEW` — Use a new, increasing version for every release.
- `RULE-TAG` — Never reuse or move a tag after pushing it.
- `RULE-WAIT` — Wait for all six workflow jobs before announcing the release.
- `RULE-OLD` — Do not push old `v*` tags just to recreate history. Every pushed
  `v*` tag starts the release workflow and could make Homebrew point to an older
  version.
- `RULE-SHA` — Never guess or manually invent a checksum. The workflow creates
  checksums from the built executables.

## `TROUBLESHOOTING` — Find the failed step first

Open the release run in GitHub Actions. The first red job tells you which section
below to use.

### `FAIL-COORDINATOR` — `Prepare and merge release` stopped

- `FAIL-COORDINATOR-1` — If pull-request creation or merging was forbidden,
  complete `SETUP-ACTIONS-1` through `SETUP-RULES-1`, then start `Release
version` again with the same target.
- `FAIL-COORDINATOR-2` — If `main` moved before the release PR merged, wait for
  the new `main` Checks run, then start the same version again. The workflow
  validates and rebases its mechanical release commit before rerunning checks.
- `FAIL-COORDINATOR-3` — If you deliberately cancelled or closed the release
  PR, the stopped run is expected. Confirm that no release tag was created.
- `FAIL-COORDINATOR-4` — Never add a manual code or documentation fix to the
  generated release branch. Merge the fix into `main` through its own PR.
- `FAIL-COORDINATOR-5` — If GitHub reports that required `Checks` are expected,
  confirm `SETUP-TOKEN-1` through `SETUP-TOKEN-3`. A manually dispatched check
  cannot replace GitHub's approval-required pull-request check.
- `FAIL-COORDINATOR-6` — If a release branch was successfully rebased but its
  pull request still showed the previous commit briefly, retry after merging
  the synchronization fix. The workflow now waits for GitHub instead of
  treating this temporary delay as a changed pull request.

### `FAIL-COMMAND` — The local release command stopped

- `FAIL-COMMAND-1` — If the working tree is not clean, commit or stash only the
  work you intend to preserve. The command never stashes unrelated changes.
- `FAIL-COMMAND-2` — If local `main` differs from `origin/main`, inspect the
  divergence instead of forcing it into alignment.
- `FAIL-COMMAND-3` — If `gh` is unavailable or unauthenticated, install GitHub
  CLI and run `gh auth login` before retrying the prepare stage.
- `FAIL-COMMAND-4` — If a check fails after the release branch is created, the
  command leaves the three version-file changes visible for diagnosis. Do not
  tag that branch.
- `FAIL-COMMAND-5` — If pushing succeeded but pull-request creation failed, run
  `gh pr create --base main --head release/v<version>` after fixing GitHub CLI.

### `FAIL-NO-RUN` — No workflow appeared

- `FAIL-NO-RUN-1` — For the normal path, confirm that you opened `Release
version`, selected `main`, and selected the final **Run workflow** button.
- `FAIL-NO-RUN-2` — For the local fallback, confirm the tag begins with `v` and
  was pushed to `TimVdWalle/vulci-language`. A local-only tag does not trigger
  GitHub.

### `FAIL-CHECKS` — `Checks` is red

- `FAIL-CHECKS-1` — If `Verify release version` failed, compare the tag,
  `package.json`, both root version fields in `package-lock.json`, and
  `src/version.ts`. They must match exactly.
- `FAIL-CHECKS-2` — If another command failed, open that step's log and run the
  same named command locally.

Fix code or configuration through a pull request, then use a new version and
tag. Do not bypass the checks or move the failed tag.

### `FAIL-BUILD` — An ARM64 or Intel build is red

Open the red architecture job. Check whether `Build executable` or
`Smoke-test executable` failed. The workflow correctly stops unless both Mac
executables succeed.

### `FAIL-GITHUB` — `Publish GitHub Release` is red

Inspect `Verify checksums` and `Publish release`. Also check whether that tag or
GitHub Release already exists. Do not delete or move anything until you know
which state already exists. After correcting only an external or transient
failure, start `Release version` again with the same version; it validates and
reuses a complete existing release instead of replacing its assets.

### `FAIL-HOMEBREW` — `Update Homebrew tap` is red

Open the [Homebrew connection guide](HOMEBREW_CONNECTION.md). Its
`TOKEN-ROTATION` and `CONNECTION-CHECK` sections cover the token, secret,
repository, permission, and branch checks.

If only the token or another external setting was corrected, use GitHub's
**Re-run failed jobs** action on the same run. The re-run uses the original
commit and tag. Starting `Release version` again with the same version is also a
supported recovery path.

If source code or workflow configuration must change, merge the fix and create a
new version and tag.

### `FAIL-OLD-BREW` — Homebrew still shows the old version

1. `FAIL-OLD-BREW-1` — Confirm the formula on GitHub contains the new version.
2. `FAIL-OLD-BREW-2` — Run `brew update`.
3. `FAIL-OLD-BREW-3` — Run `brew upgrade vulci`.
4. `FAIL-OLD-BREW-4` — Run `vulci --version` again.

### `FAIL-DOWNLOAD` — Homebrew cannot download or verify the executable

Compare the formula's URL and SHA-256 value with the matching GitHub Release
files. The version and architecture names must match exactly. Never replace a
checksum with a guessed value.

## `KNOWN-GOOD` — Working example

- `KNOWN-TAG` — Release `v0.15.0` used source commit `96ca9ff`.
- `KNOWN-RUN` — Its [release workflow run](https://github.com/TimVdWalle/vulci-language/actions/runs/31837930990)
  succeeded completely.
- `KNOWN-TAP` — It generated tap commit `03c4c42`, named
  `Update Vulci to 0.15.0`.
- `KNOWN-INTEL` — A real Intel Mac installation and Homebrew formula test
  succeeded.
- `KNOWN-ARM` — The ARM64 build and smoke test succeeded in GitHub Actions.

Compare a future failure with this run and tap commit to see what changed.

## `RELEASE-REFERENCES` — Official documentation

- `REF-RERUN` — [GitHub: Re-running workflows and jobs](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs)
- `REF-TAP` — [Homebrew: How to create and maintain a tap](https://docs.brew.sh/How-to-Create-and-Maintain-a-Tap)
