# simpler-grants-protocol/lib

This directory contains independently versioned packages for the Simpler Grants Protocol, supporting both Python and Node.js packages.

Versioning is managed via [Changesets](https://github.com/changesets/changesets), with native support for Node.js packages via pnpm and a custom script to handle Python package versioning.

---

## Purpose

This setup enables:

- Independent versioning of Python and Node.js packages  
- Semantic version tracking via Changesets  
- Automated changelog generation  
- Git tagging per package  
- Optional GitHub release creation from tags  

---

## Directory Layout

```
lib/
├── core/                  # Node package stub
│   ├── package.json
│   └── index.js
├── cli/                   # Node package stub
│   ├── package.json
│   └── index.js
└── python-sdk/            # Python package
    ├── package.json       # Required for Changesets detection
    ├── pyproject.toml     # Python project metadata
    ├── CHANGELOG.md       # Maintained via bump script
    └── common_grants_sdk/ # SDK source code
```

---

## Versioning Overview

### Node Packages

- Versioning is handled automatically by Changesets when `pnpm changeset version` is run
- Applies the following changes:
  - Bumps version in `package.json`
  - Updates or creates `CHANGELOG.md`
  - Creates a Git tag (e.g. `core@1.0.0`)

### Python Packages

- Versioning is handled automatically by a custom script that runs after `pnpm changeset version`
- Applies the following changes:
  - Bumps version in `pyproject.toml`
  - Bumps version in `package.json`
  - Updates or creates `CHANGELOG.md`
  - Creates a Git tag (e.g. `common_grants_sdk@0.3.1`)
---

## Developer Instructions

### Step 1: Make Your Code Changes

Modify the appropriate files under any `lib/` package.

### Step 2: Generate a Changeset

Run this from the root directory `simpler-grants-protocol/`:

```bash
pnpm changeset
```

Follow the CLI prompts:

- Select the package(s) affected (e.g. `common_grants_sdk`)
- Choose version bump type (patch, minor, major)
- Provide a short summary

This will create a Markdown file in `.changeset/` like:

```markdown
---
"common_grants_sdk": patch
---

Fix logic bug in base class method
```

### Step 3: Commit the Changes

Include both your code changes and the `.changeset/*.md` file in the PR.

### Step 4: Merge the PR

Once changes are merged to `main`, the `version.yml` GitHub Action workflow runs and applies versioning updates:

- **Python Packages**
  - Runs `scripts/bump_python_version.py`
  - Applies the following updates:
    - Bumps version in `pyproject.toml`
    - Bumps version in `package.json`
    - Updates or creates `CHANGELOG.md`
    - Creates a Git tag (e.g. `common_grants_sdk@0.3.1`)

- **Node Packages**
  - Runs `pnpm changeset version`
  - Applies the following updates:
    - Bumps version in `package.json`
    - Updates or creates `CHANGELOG.md`
    - Creates a Git tag (e.g. `core@1.0.0`)

### Step 5: (Optional) Trigger GitHub Release from Tag

To manually generate a GitHub Release from a tag:

1. Go to the **Actions** tab on GitHub
2. Select **Create GitHub Release from Tag**
3. Click **Run workflow**
4. Enter or select a tag (e.g. `common_grants_sdk@0.3.1`)
5. Click **Run workflow** to generate the release

---

## Manual Validation Checklist

After a PR is merged and the `version.yml` workflow runs:

1. **Confirm version bump**
   - For Python packages: check `pyproject.toml` and `package.json` under `lib/python-sdk/`
   - For Node packages: check `package.json` under each affected package (e.g. `lib/core/`, `lib/cli/`)

2. **Confirm changelog**
   - Open the `CHANGELOG.md` for each affected package
   - Example path: `lib/python-sdk/CHANGELOG.md`
   - Ensure the top entry reflects the correct version and summary

3. **Confirm Git tag**
   - Go to GitHub > Code > Tags
   - Verify that a tag was created for each updated package (e.g. `common_grants_sdk@0.3.1`, `core@1.0.0`)

4. **Confirm version commit**
   - Check the commit history for a message like `chore: version packages [skip ci]` from `github-actions[bot]`

---

## Notes

- Python packages must include a `package.json` file to satisfy Changesets requirements
- All version bumps are driven by the existence and content of `.changeset/*.md` files
- The `bump_python_version.py` script is the authoritative source of truth for Python versioning logic

