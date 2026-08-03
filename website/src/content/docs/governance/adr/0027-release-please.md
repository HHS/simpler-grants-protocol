---
title: Release automation with release-please
description: Records the decision to replace Changesets with release-please for versioning and releasing the monorepo's published packages.
---

The CommonGrants monorepo publishes four packages — `@common-grants/core`, `@common-grants/cli`, and `@common-grants/sdk` to npm, and `common-grants-sdk` to PyPI. [ADR 0010](/governance/adr/0010-release-workflow/) chose Changesets to version and release them independently.

In practice, the Changesets-based workflow developed several recurring problems:

- Contributors must remember to author a `.changeset/*.md` file for every release-worthy change; a forgotten file ships the change silently unversioned.
- The version-bump workflow runs the moment any changeset lands on `main`, so the team cannot stack several merged changes into one release.
- The bump commit is pushed directly to `main` by CI, which requires keeping branch protections disabled.
- Changesets is a Node-only tool: the Python SDK needs a vestigial `package.json` and a shell script that greps changeset files to decide the Poetry version bump.
- Publishing is a separate, manually triggered step that someone must remember to run after each version bump.

This ADR supersedes ADR 0010's choice of Changesets.

## Decision

We will adopt [release-please](https://github.com/googleapis/release-please) in manifest mode for the four published packages. Version bumps and changelog entries are derived from the conventional-commit history on `main` (the squashed PR titles). Each package gets its own Release PR that accumulates changes until the team merges it; merging tags the release, creates the GitHub release, and triggers publishing automatically.

### Positive consequences

- The commit history is the release metadata — there is no separate file for contributors to forget.
- Multiple merged changes stack in an open Release PR and ship only when it is merged, so the team controls release timing.
- Version bumps land through a normal PR, so branch protections on `main` can be re-enabled.
- The Python SDK uses `release-type: python` against the real `pyproject.toml`; the vestigial `package.json` and shell-parsing step are removed.
- Merging a Release PR publishes automatically — no separate manual deploy step to remember.
- Release notes are generated from PR titles, reading like a changelog rather than a list of changeset summaries.

### Negative consequences

- Conventional-commit PR titles become mandatory and release-facing; a mistyped title puts a change in the wrong category (or omits it entirely), so a CI title check is required.
- Contributors must know which commit types map to which version bumps.
- Commits that do not follow the conventional format are invisible to release-please, so changelog entries for the period before adoption may under-report.
- A commit's type applies to every package whose files it touches; PRs that span packages need deliberate scoping.

## Criteria

- No release step that depends on contributors remembering a separate artifact.
- The team controls when releases ship, independent of when changes merge.
- Branch protections on `main` stay enabled.
- First-class support for the Python package.
- Automated changelogs, tags, and GitHub releases.
- Publishing triggered by the release step itself.

## Options considered

- **Option 1:** Keep the current Changesets workflow.
- **Option 2:** Keep Changesets, but adopt the official `changesets/action` Version-PR mode.
- **Option 3:** Adopt release-please in manifest mode.

## Evaluation

### Side-by-side

- ✅ Criterion met
- ❌ Criterion not met
- 🟡 Partially met or unsure

| Criteria                          | Option 1 | Option 2 | Option 3 |
| --------------------------------- | :------: | :------: | :------: |
| No forgettable release artifact   |    ❌    |    ❌    |    ✅    |
| Team-controlled release timing    |    ❌    |    ✅    |    ✅    |
| Branch protections stay enabled   |    ❌    |    ✅    |    ✅    |
| First-class Python support        |    ❌    |    ❌    |    ✅    |
| Automated changelogs and releases |    🟡    |    🟡    |    ✅    |
| Publish triggered by release step |    ❌    |    ✅    |    ✅    |
| No new contributor conventions    |    ✅    |    ✅    |    ❌    |

### Option 1: Keep the current Changesets workflow

:::note[Bottom line]
Option 1 is best if:

- We want zero migration effort and no new contributor conventions.
- We can live with forgotten changesets, immediate bumps, and disabled branch protections.
  :::

#### How it works

- **Summary:** The status quo. Contributors author `.changeset/*.md` files; a CI workflow detects them on `main`, bumps versions (via `pnpm changeset version` for Node, a shell script + Poetry for Python), commits directly to `main`, and tags. Publishing is a separate manually dispatched workflow per package.

#### Tradeoffs

- **Pros**
  - No migration work; the team already knows the flow.
  - Bump type is declared explicitly per change, not inferred from commit type.
- **Cons**
  - A forgotten changeset ships a change unversioned, with no structural backstop.
  - Versions bump as soon as one changeset lands — no batching.
  - CI pushes to `main` force branch protections off.
  - Python support is bolted on (vestigial `package.json`, shell parsing).
  - Publishing requires a separate manual step.

### Option 2: Changesets with the official Version-PR mode

:::note[Bottom line]
Option 2 is best if:

- We want batching and PR-based bumps with the smallest change to contributor habits.
- We accept that forgotten changesets and second-class Python support are inherent to Changesets.
  :::

#### How it works

- **Summary:** Replace the custom bump workflow with the official [`changesets/action`](https://github.com/changesets/action), which maintains a "Version Packages" PR that accumulates pending changesets. Merging that PR applies the bumps and can trigger publishing.

#### Tradeoffs

- **Pros**
  - Batching and team-controlled timing, like release-please.
  - Bumps land via a PR, so branch protections can be re-enabled.
  - Contributor-facing workflow (authoring changesets) is unchanged.
- **Cons**
  - The forgotten-changeset failure mode is unchanged — it is inherent to the design.
  - Python stays second-class: the vestigial `package.json` and custom bump script remain.
  - Still a single combined Version PR for all Node packages rather than one per package.

### Option 3: Adopt release-please in manifest mode

:::note[Bottom line]
Option 3 is best if:

- We want the commit history itself to drive releases, with no separate artifact to forget.
- We are willing to adopt conventional-commit PR titles and enforce them in CI.
  :::

#### How it works

- **Summary:** A GitHub workflow runs [release-please](https://github.com/googleapis/release-please) on every push to `main`. It parses conventional commits, attributes them to packages by the paths they touch, and maintains one Release PR per package (`separate-pull-requests`). Merging a Release PR bumps the version (`package.json` or `pyproject.toml`), updates the changelog, tags with the existing `name@version` format, creates the GitHub release, and fans out to the per-package publish workflows.
- **Common workflows:**
  1. **Regular change:** Merge a PR titled `fix(ts-sdk): ...` or `feat(core): ...`; the affected package's Release PR is opened or updated automatically.
  2. **Stacking changes:** Merge several PRs; they accumulate in the open Release PR until the team merges it.
  3. **Release:** Merge the Release PR; tagging, GitHub release, and npm/PyPI publish happen automatically.
  4. **Merge without release-worthy changes:** `chore:`/`ci:`/`test:` commits do not open Release PRs (unless marked breaking with `!`).

#### Tradeoffs

- **Pros**
  - No forgettable artifact; every squashed commit is parsed.
  - Per-package Release PRs give batching and independent release timing.
  - Native Python release type; the version is edited only in `pyproject.toml` (release-please mirrors it into `common_grants_sdk/__init__.py` on each release).
  - Bumps via PR, so branch protections can stay enabled.
  - Existing `name@version` tag format is preserved exactly.
- **Cons**
  - Requires conventional-commit PR titles, enforced by a CI check.
  - Bump types are inferred from commit types, which contributors must learn.
  - Non-conventional commits are invisible to changelogs.
