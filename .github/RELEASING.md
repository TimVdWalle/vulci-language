<!-- Phase: Phase 15B CLI, distribution, and quality hardening -->

# How to Release Vulci

Use this file when publishing a normal release or when a release fails.

For the one-time repository connection and token instructions, use the separate
[Homebrew connection guide](HOMEBREW_CONNECTION.md).

Labels such as `RELEASE-3` are just names for the steps. They help identify
exactly where a problem occurred.

## `RELEASE` — Publish a new version

Run the release command in the local `vulci-language` repository. The example
version is `0.17.0`; replace it with the version being released.

The repository uses npm and `package-lock.json`, so the canonical command is:

```bash
npm run release -- 0.17.0
```

If pnpm is installed, this equivalent spelling also works:

```bash
pnpm run release 0.17.0
```

The prepare stage requires [GitHub CLI](https://cli.github.com/) authenticated
for this repository. Check it once with `gh auth status`.

### `RELEASE-1` — Prepare the version pull request

Merge the release's language or tooling work into `main` first. Then run the
release command from a clean local `main` whose current version is lower than
the requested version.

The command performs these guarded operations:

- `RELEASE-PREP-1` — Fetches `origin` and requires local `main` to match
  `origin/main` exactly.
- `RELEASE-PREP-2` — Rejects malformed or non-increasing versions and existing
  release branches or tags.
- `RELEASE-PREP-3` — Creates `release/v0.17.0`.
- `RELEASE-PREP-4` — Updates `package.json`, both version fields in
  `package-lock.json`, and `src/version.ts`.
- `RELEASE-PREP-5` — Verifies version alignment, runs `npm run check`, and runs
  `npm run coverage`.
- `RELEASE-PREP-6` — Commits only the three version files, pushes the branch,
  and opens the release pull request.

If the requested version is already present on `origin/main`, the command skips
the prepare stage and proceeds to `RELEASE-3`.

### `RELEASE-2` — Review and merge the pull request

Review the version-only pull request and wait for its GitHub check to succeed.
Merge it into `main`. The release command deliberately does not approve or merge
its own pull request.

### `RELEASE-3` — Publish after the merge

Run the exact same command again:

```bash
npm run release -- 0.17.0
```

The command fetches the merged `origin/main`, switches to and fast-forwards
local `main` when needed, verifies every version source, reruns checks and
coverage, creates the annotated `v0.17.0` tag, and pushes it. Pushing the tag
starts the release workflow.

If the remote tag already points to the synchronized `main` commit, the command
reports that the release is already published without moving or recreating it.

### `RELEASE-4` — Wait for GitHub Actions

Open the [Vulci Release workflow](https://github.com/TimVdWalle/vulci-language/actions/workflows/release.yml),
then open the run for the tag you just pushed.

Wait until all five jobs are green:

- `RELEASE-JOB-1` — `Checks`
- `RELEASE-JOB-2` — `Build macOS arm64`
- `RELEASE-JOB-3` — `Build macOS x64`
- `RELEASE-JOB-4` — `Publish GitHub Release`
- `RELEASE-JOB-5` — `Update Homebrew tap`

Homebrew is not updated until the final job succeeds.

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

## `RELEASE-RULES` — Important rules

- `RULE-MAIN` — Tag only after the release commit is merged into `main`.
- `RULE-PR` — Keep the version update reviewable; never make the release command
  merge its own pull request.
- `RULE-NEW` — Use a new, increasing version for every release.
- `RULE-TAG` — Never reuse or move a tag after pushing it.
- `RULE-WAIT` — Wait for all five workflow jobs before announcing the release.
- `RULE-OLD` — Do not push old `v*` tags just to recreate history. Every pushed
  `v*` tag starts the release workflow and could make Homebrew point to an older
  version.
- `RULE-SHA` — Never guess or manually invent a checksum. The workflow creates
  checksums from the built executables.

## `TROUBLESHOOTING` — Find the failed step first

Open the release run in GitHub Actions. The first red job tells you which section
below to use.

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

- `FAIL-NO-RUN-1` — Confirm the tag begins with `v`.
- `FAIL-NO-RUN-2` — Confirm you pushed the tag to
  `TimVdWalle/vulci-language`. A local-only tag does not trigger GitHub.

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
which state already exists.

### `FAIL-HOMEBREW` — `Update Homebrew tap` is red

Open the [Homebrew connection guide](HOMEBREW_CONNECTION.md). Its
`TOKEN-ROTATION` and `CONNECTION-CHECK` sections cover the token, secret,
repository, permission, and branch checks.

If only the token or another external setting was corrected, use GitHub's
**Re-run failed jobs** action on the same run. The re-run uses the original
commit and tag.

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
