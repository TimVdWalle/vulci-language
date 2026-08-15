<!-- Phase: Phase 15B CLI, distribution, and quality hardening -->

# Homebrew Repository Connection and Token

Use this file when the `Update Homebrew tap` release job fails, when the token
must be replaced, or when you need to recreate the connection between the two
repositories.

For a normal release, use [How to release Vulci to Homebrew](RELEASING.md).

## `CONNECTION-SUMMARY` — How it works

```text
Tag pushed to vulci-language
            |
            v
      Release workflow
        /          \
       v            v
GitHub Release   HOMEBREW_TAP_TOKEN
with binaries           |
                        v
              homebrew-vulci repository
              with Formula/vulci.rb
```

- `REPO-SOURCE` — `TimVdWalle/vulci-language` contains the source code and the
  release workflow. It creates the executables and GitHub Release.
- `REPO-TAP` — `TimVdWalle/homebrew-vulci` contains the Homebrew formula. The
  formula tells Homebrew which executable to download and which checksum to
  expect.
- `REPO-TOKEN` — `HOMEBREW_TAP_TOKEN` allows the workflow in the first
  repository to push the generated formula into the second repository.

The token value is stored by GitHub as an Actions secret. It is not stored in
either Git repository.

## `CONNECTION-SETUP` — Recreate the connection

### `CONNECTION-1` — Prepare the tap repository

Create the public repository `TimVdWalle/homebrew-vulci` with an initial `main`
branch.

The `homebrew-` prefix is important. It makes Homebrew translate the tap name
`TimVdWalle/vulci` into the repository `TimVdWalle/homebrew-vulci`. This is why
the full installation name is `TimVdWalle/vulci/vulci`.

The formula can be created by the first successful release. Executable files
stay in the `vulci-language` GitHub Release; do not commit them to the tap.

### `CONNECTION-2` — Create the token

In the maintainer's GitHub account:

1. `TOKEN-1` — Open **Settings → Developer settings → Personal access tokens →
   Fine-grained tokens**.
2. `TOKEN-2` — Create a token. A name such as
   `Vulci Homebrew tap updater` is recommended, but the workflow does not depend
   on this display name.
3. `TOKEN-3` — Set the resource owner to `TimVdWalle`.
4. `TOKEN-4` — Choose **Only select repositories** and select only
   `homebrew-vulci`.
5. `TOKEN-5` — Under repository permissions, give **Contents**
   **Read and write** access. Do not add unrelated permissions.
6. `TOKEN-6` — Choose an expiration and create a private calendar reminder
   before it expires.
7. `TOKEN-7` — Generate the token and copy its value when GitHub shows it.

Never put the token value in a file, commit, issue, pull request, or this guide.

To check its status or expiration later, return to the **Fine-grained tokens**
page in the GitHub account that created it. The Git repositories do not contain
its expiration date.

### `CONNECTION-3` — Save the token as an Actions secret

Open the GitHub repository `TimVdWalle/vulci-language`, then:

1. `SECRET-1` — Open **Settings → Secrets and variables → Actions**.
2. `SECRET-2` — Select **New repository secret**.
3. `SECRET-3` — Enter the exact name `HOMEBREW_TAP_TOKEN`.
4. `SECRET-4` — Paste the token value and save the secret.

The secret belongs in `vulci-language`, not `homebrew-vulci`, because the
release workflow runs from `vulci-language`.

### `CONNECTION-4` — The workflow uses the secret

The `Update Homebrew tap` job in `.github/workflows/release.yml`:

1. `WORKFLOW-1` — Checks out `vulci-language`.
2. `WORKFLOW-2` — Checks out `homebrew-vulci` using
   `HOMEBREW_TAP_TOKEN`.
3. `WORKFLOW-3` — Downloads the executables and checksums from the release run.
4. `WORKFLOW-4` — Runs `scripts/generate-homebrew-formula.mjs`.
5. `WORKFLOW-5` — Commits `Formula/vulci.rb` as `github-actions[bot]` and pushes
   it to the tap's `main` branch.

That is the complete link between the repositories. No token is required for
normal Homebrew users.

## `TOKEN-ROTATION` — Replace an expiring or broken token

1. `ROTATE-1` — Create a replacement token by repeating `TOKEN-1` through
   `TOKEN-7` with the same repository and Contents permission.
2. `ROTATE-2` — In the `vulci-language` Actions secrets, replace the value of
   `HOMEBREW_TAP_TOKEN`.
3. `ROTATE-3` — Re-run the failed release jobs, or verify the replacement during
   the next release.
4. `ROTATE-4` — Revoke the old token after the replacement has been saved.

The workflow file does not need to change if the secret keeps the exact name
`HOMEBREW_TAP_TOKEN`.

## `CONNECTION-CHECK` — Check the link when Homebrew updating fails

Check these in order:

1. `CHECK-1` — Does `vulci-language` still have an Actions secret named exactly
   `HOMEBREW_TAP_TOKEN`?
2. `CHECK-2` — Is its fine-grained token still active and unexpired?
3. `CHECK-3` — Does the token still select only
   `TimVdWalle/homebrew-vulci`?
4. `CHECK-4` — Does it still have Contents read/write permission?
5. `CHECK-5` — Does `homebrew-vulci` still exist with a `main` branch?
6. `CHECK-6` — Does `.github/workflows/release.yml` still use the same repository
   and secret names?

After correcting only a token or external GitHub setting, use **Re-run failed
jobs** on the original release run.

## `FUTURE-CHANGES` — Names and locations that must stay aligned

| ID                | What                         | Current value or location                     |
| ----------------- | ---------------------------- | --------------------------------------------- |
| `KEEP-SOURCE`     | Source repository            | `TimVdWalle/vulci-language`                   |
| `KEEP-TAP`        | Tap repository               | `TimVdWalle/homebrew-vulci`                   |
| `KEEP-BRANCH`     | Tap default branch           | `main`                                        |
| `KEEP-SECRET`     | Actions secret name          | `HOMEBREW_TAP_TOKEN`                          |
| `KEEP-PERMISSION` | Token access                 | Contents read/write on only `homebrew-vulci`  |
| `KEEP-FORMULA`    | Generated formula            | `homebrew-vulci/Formula/vulci.rb`             |
| `KEEP-WORKFLOW`   | Release automation           | `.github/workflows/release.yml`               |
| `KEEP-GENERATOR`  | Formula generator            | `scripts/generate-homebrew-formula.mjs`       |
| `KEEP-BUILD`      | Node version and Mac runners | Defined in `release.yml` and the build script |

If GitHub retires a runner, an action version stops working, authentication
rules change, or either repository is renamed, start with the failing workflow
step and this table. Update the affected value in a reviewed pull request before
creating another release tag.

## `CONNECTION-BASELINE` — Known working setup

- `BASELINE-RUN` — Release workflow run
  <https://github.com/TimVdWalle/vulci-language/actions/runs/31837930990>
  succeeded for `v0.15.0`.
- `BASELINE-TAP` — It generated tap commit `03c4c42`, named
  `Update Vulci to 0.15.0`.

Use these as working examples when comparing a future failure.

## `CONNECTION-REFERENCES` — Official documentation

- `REF-TOKEN` — [GitHub: Managing personal access tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
- `REF-SECRET` — [GitHub: Using secrets in GitHub Actions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)
- `REF-RERUN` — [GitHub: Re-running workflows and jobs](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/re-run-workflows-and-jobs)
- `REF-TAP` — [Homebrew: How to create and maintain a tap](https://docs.brew.sh/How-to-Create-and-Maintain-a-Tap)
