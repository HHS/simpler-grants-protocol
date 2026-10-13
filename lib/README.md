# simpler-grants-protocol / lib

This directory contains independently versioned packages for the Simpler Grants Protocol, supporting both Python and Node.js.

Versioning is managed via [release-please](https://github.com/googleapis/release-please), driven by the conventional-commit history on `main`. There is no separate versioning file to author: the squashed commit title of each merged PR determines whether and how each package's version bumps.

---

## Purpose

This setup enables:

- Independent versioning of Python and Node.js packages
- Version bumps derived from conventional commits (no manual bookkeeping)
- Automated changelog generation
- Git tagging and GitHub release creation per package
- Automated publishing to npm / PyPI when a Release PR is merged

---

## Directory Layout

```
lib/
├── core/                  # Node package
│   ├── package.json
│   └── CHANGELOG.md       # Auto-maintained by release-please
├── cli/                   # Node package
│   ├── package.json
│   └── CHANGELOG.md
├── ts-sdk/                # Node package
│   ├── package.json
│   └── CHANGELOG.md
└── python-sdk/            # Python package
    ├── pyproject.toml     # Python project metadata (owns the version)
    ├── CHANGELOG.md
    └── common_grants_sdk/ # SDK source code
```

---

## How releases work

### Step 1: Make your code changes

Modify the appropriate files under any `lib/` package.

### Step 2: Title your PR with a conventional commit

The PR title becomes the squashed commit subject on `main`, which release-please parses. The type determines the version bump for every package whose files the PR touches:

| PR title | Bump |
|----------|------|
| `fix(core): handle empty filter values` | patch |
| `feat(ts-sdk): add transform helpers` | minor |
| `feat(cli)!: drop Node 20 support` | major (minor while packages are pre-1.0) |
| `chore: ...`, `ci: ...`, `test: ...` | no release (a breaking `!` marker still releases) |
| `perf: ...`, `revert: ...`, `docs: ...`, `refactor: ...`, `build: ...` | patch |

A `BREAKING CHANGE:` footer in the squashed commit body also triggers a breaking bump.

### Step 3: Merge the PR

Once the PR is merged into `main`, the `cd-release.yml` workflow updates (or opens) a **Release PR** for each affected package. The Release PR accumulates every releasable commit since the package's last release, and contains the version bump (`package.json` for Node packages, `pyproject.toml` and `common_grants_sdk/__init__.py` for Python) plus the generated `CHANGELOG.md` entry.

Nothing is published at this point. Merges can stack in the Release PR until the team is ready to ship.

Merges into a [hold branch](#hold-branches) don't trigger this. Release Please only runs on pushes to `main`.

### Step 4: Merge the Release PR to publish

Merging a package's Release PR:

1. Tags `main` with the new version (e.g. `@common-grants/core@0.4.0`, `common-grants-sdk@0.9.0`)
2. Creates the GitHub release with the changelog entry as its notes
3. Publishes the package from the same workflow run, to npm (Node packages) or PyPI (Python SDK)

### Re-running a failed publish

- **Publish retry (npm or PyPI):** Dispatch `cd-release.yml` with the package and its existing tag. This publishes only; it does not create a release.
- **Release Please retry:** Re-run the failed Action or merge another commit to `main`.

---

## Hold branches

A hold branch collects the `feat` and breaking work for one minor release so it ships together. Two PRs carry it out:

- **Staging PR:** a draft PR from the hold branch into `main`. Squash-merging it ships the work to `main`.
- **Release PR:** opened by Release Please on `main`. Merging it publishes the package.

The rules:

- **One milestone and one hold branch per minor release, per package.** A maintainer creates both, branching from `main`. Title the milestone like `[Core] v0.5.0 release` and name the branch to mirror it. For example, the core v0.5.0 work lives on `CORE-v0.5.0`.
- **What goes into the hold branch:** `feat` and breaking (`!`) work for that release, and fixes to that unreleased work.
- **What goes straight to `main`:** `fix` PRs for code already released on `main`, Dependabot and security updates, and docs that don't describe unreleased work. If a package has no open hold branch, `feat` work goes to `main` too.
- **Releases are always cut from `main`.**
- **Hold branches aren't for blocked work.** A PR waiting on a review, a decision or another PR stays open against its usual base. The hold branch is for finished work that shouldn't ship yet.
- **Keep it current with `main`.** Use **Update branch** on the staging PR, or rebase, at least weekly.
- **Open the staging PR early.** Open it as soon as the hold branch exists. CI and the website preview then run on all the release's changes together, and the PR updates as each PR lands. "This branch is out-of-date with the base branch" is normal. A real merge conflict stops CI and the preview, so resolve it right away.

### SDK changes

- Keep SDK changes on the SDK's own hold branch. If they need unreleased core functionality, branch the SDK hold branch from the core hold branch, and point it at `main` once core is released.
- If SDK changes do ride on the core hold branch, merging it also opens an SDK Release PR. Don't merge that SDK Release PR until the SDK's own hold work has landed on it.

## Releasing from a hold branch

These steps apply to every package. Each package's runbook adds its own checks: [core](core/DEVELOPMENT.md#release-runbook), [CLI](cli/DEVELOPMENT.md#release-runbook), [TypeScript SDK](ts-sdk/DEVELOPMENT.md#release-runbook), [Python SDK](python-sdk/DEVELOPMENT.md#release-runbook).

- [ ] A second person reviews the release. For core, always.
- [ ] Every PR in the milestone has merged into the hold branch. Fixes found during review go in as small PRs into the hold branch.
- [ ] The hold branch is synced with `main`, and CI is green on the staging PR.
- [ ] The package's release review is done and noted on the staging PR.
- [ ] The staging PR description is ready to become the squash commit body:
  - Release Please builds `CHANGELOG.md` from commit headers, not body text, so a plain list of changes only reaches git history.
  - For one changelog entry per change, end the description with each change as its own conventional-commit line, separated by blank lines (for example `feat(core): add funders to OpportunityBase`). These entries apply to every package the squash touches.
  - List breaking changes in a `BREAKING CHANGE:` footer. A `!` in the title alone only repeats the title in the changelog.
  - To fix entries after the merge, edit the merged staging PR's description and add a `BEGIN_COMMIT_OVERRIDE` ... `END_COMMIT_OVERRIDE` block with the corrected lines. Release Please uses it in place of the commit message on its next run.
- [ ] The staging PR title uses `feat(<scope>):`, or `feat(<scope>)!:` if the release has breaking changes. While packages are below 1.0, a `!` title still bumps the minor version, not the major (`bump-minor-pre-major` in `release-please-config.json`).
- [ ] The staging PR has been squash-merged into `main`, and Release Please opened or updated the Release PR for each package it touched.
- [ ] The Release PR has been merged. This tags the release, creates the GitHub release and publishes the package. Then run the [manual validation checklist](#manual-validation-checklist).
- [ ] The milestone is closed and the hold branch is deleted. GitHub only auto-closes issues when a PR merges into `main`, so close any issues fixed through the hold branch by hand.

---

## Manual Validation Checklist

After merging a Release PR:

1. **Confirm the tag and GitHub release**
   - Go to GitHub > Code > Tags and verify the new per-package tag exists
   - Verify a GitHub release with changelog notes was created for that tag

2. **Confirm the published artifact**
   - Node packages: check the new version on npm (`@common-grants/core`, `@common-grants/cli`, `@common-grants/sdk`)
   - Python SDK: check the new version on PyPI (`common-grants-sdk`)

3. **Confirm changelog**
   - Open the `CHANGELOG.md` for the released package and ensure the top entry reflects the new version

---

## Notes

- Per-package versions are tracked in `.release-please-manifest.json`; release-please config lives in `release-please-config.json` (both at the repo root).
- The Python SDK's version lives only in `pyproject.toml` (mirrored into `common_grants_sdk/__init__.py` by release-please); it has no `package.json`.
- `lib/changelog-emitter` is unpublished and excluded from releases by omission from `release-please-config.json`.
