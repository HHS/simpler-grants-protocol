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

Once the PR is merged into `main`, the `release-please.yml` workflow updates (or opens) a **Release PR** for each affected package. The Release PR accumulates every releasable commit since the package's last release, and contains the version bump (`package.json` for Node packages, `pyproject.toml` and `common_grants_sdk/__init__.py` for Python) plus the generated `CHANGELOG.md` entry.

Nothing is published at this point — merges can stack in the Release PR until the team is ready to ship.

### Step 4: Merge the Release PR to publish

Merging a package's Release PR:

1. Tags `main` with the new version (e.g. `@common-grants/core@0.4.0`, `common-grants-sdk@0.9.0`)
2. Creates the GitHub release with the changelog entry as its notes
3. Triggers the package's deploy workflow, publishing to npm (Node packages) or PyPI (Python SDK)

### Re-running a failed publish

To retry an npm publish for an existing tag, dispatch `release-please.yml` from the **Actions** tab, pick the package, and enter the release tag. npm binds each package's trusted publisher to the *calling* workflow's filename, so the three npm deploy workflows have no dispatch trigger of their own — running one directly would not authenticate.

That dispatch publishes only. It does not re-run Release Please, so it cannot create or modify a release; the Release PR flow above is the only way a release is cut. If the `release-please` job itself failed, re-run that failed run from the **Actions** tab, or land another commit on `main` — there is no input-driven way to re-run it.

The Python SDK is unaffected: `cd-deploy-lib-pysdk.yml` keeps its own `workflow_dispatch`, because PyPI auth is a repository secret rather than a caller-bound trusted publisher.

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
