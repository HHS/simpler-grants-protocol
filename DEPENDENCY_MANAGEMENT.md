# Dependency Management

## Strategy

- Group GitHub Actions major bumps into a single PR
- Group minor/patch updates by manifest (e.g. `pnpm-lock.yaml` or `poetry.lock`) into a single PR
- Ignore major bumps for packages — these are handled manually to control breaking changes
- Catalog-managed deps (TypeSpec, vitest, etc.) bypass Dependabot entirely due to pnpm catalog bugs

This repo uses a split strategy for automated dependency updates: Dependabot handles most things, and a scheduled GitHub Actions workflow handles the rest. Expect roughly 3-5 dependency PRs per week in normal operation.

## Why two systems?

Dependabot has [multiple open bugs](https://github.com/dependabot/dependabot-core/issues/14339) with pnpm workspace catalogs (issues #14339, #13347, #12244, #12445, #13000 as of early 2026). When Dependabot touches a catalog-managed dep, it corrupts the lockfile. The workaround is to exclude those deps from Dependabot entirely and update them via a separate workflow that runs `pnpm update` + `pnpm install` directly.

## Architecture

| Tier | Tool | What it covers |
|------|------|----------------|
| Tier 1 | Dependabot | Python SDK, GitHub Actions, non-catalog workspace deps |
| Tier 2 | `deps-catalog-check` workflow | Catalog-managed deps (see [Catalog workflow scope](#catalog-workflow-scope) below) |

Config lives in `.github/dependabot.yml` and `.github/workflows/deps-catalog-check.yml`.

---

## Maintenance tiers

Dependencies are maintained at different cadences depending on whether they are core tooling or supporting assets.

| Tier | Scope | Cadence |
|------|-------|---------|
| **Core** | `lib/*`, `website`, root workspace | Automated — Dependabot + catalog workflow. Merge promptly. |
| **Templates and examples** | `templates/*`, `examples/*` | Manual — no automated PRs. Refreshed deliberately when a maintainer chooses to. |
| **GitHub Actions** | `.github/workflows` | Automated — Dependabot weekly. Merge when green. |

## Dependabot scope

Dependabot runs on three "worlds":

**World A: Root pnpm workspace** (daily)
- Updates non-catalog deps across all workspace packages
- Groups Astro/Starlight packages together (`website-framework` group)
- Groups all other minor/patch updates together (`minor-patch` group)
- Major version bumps are ignored (handled manually)
- Ignores `@common-grants/*` (internal workspace deps) and all catalog-managed deps

**World B: Isolated lockfile directories** (weekly)

| Directory | Schedule | Notes |
|-----------|----------|-------|
| `lib/python-sdk` | Weekly, Wednesdays | pip/Poetry, all deps grouped |

Templates and examples are now manually maintained and do not have Dependabot entries.

**World C: GitHub Actions** (weekly, Mondays)
- All Actions grouped into a single PR

## Catalog workflow scope

The `deps-catalog-check` workflow (`.github/workflows/deps-catalog-check.yml`) runs weekly on Mondays at ~7-8am PT (15:00 UTC). It can also be triggered manually via `workflow_dispatch` from the Actions tab.

**What it manages** (defined in `pnpm-workspace.yaml` under `catalog:`):
- TypeSpec: `@typespec/compiler`, `@typespec/http`, `@typespec/json-schema`, `@typespec/openapi`, `@typespec/openapi3`, `@typespec/rest`, `@typespec/versioning`
- Testing: `vitest`, `@vitest/coverage-v8`, `eslint-plugin-vitest`
- Linting/formatting: `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-config-prettier`, `eslint-plugin-prettier`, `globals`, `prettier`
- TypeScript: `typescript`, `ts-node`, `@types/node`
- Runtime: `zod`

The `website` catalog has its own `vitest` version (`^4.x`). The update script includes an explicit `pnpm update vitest --filter website` step to ensure it stays current alongside the default catalog.

**How it works:**
1. Runs `.github/scripts/update-catalog-deps.sh --dry-run` to check for outdated packages
2. If updates exist, runs the script without `--dry-run` to update `pnpm-workspace.yaml` and regenerate the lockfile
3. Opens a PR on branch `chore/update-catalog-deps` via `peter-evans/create-pull-request`

**Running locally:**

```bash
# Check what's outdated without making changes
./.github/scripts/update-catalog-deps.sh --dry-run

# Apply updates (modifies pnpm-workspace.yaml and pnpm-lock.yaml)
./.github/scripts/update-catalog-deps.sh
```

## Changeset expectations

Most dependency PRs don't need a changeset. You only need one when a **production dependency changes in a published package**.

| Package | Published to | Needs changeset when... |
|---------|-------------|------------------------|
| `lib/core` (`@common-grants/core`) | npm | TypeSpec peer dep ranges change |
| `lib/cli` (`@common-grants/cli`) | npm | Runtime dep versions change |
| `lib/ts-sdk` (`@common-grants/sdk`) | npm | Runtime dep versions change |
| `lib/python-sdk` (`common-grants-sdk`) | PyPI | Runtime dep versions change |

Dev-only dep bumps (vitest, eslint, type definitions, etc.) don't need changesets. When in doubt: if the dep appears in `dependencies` or `peerDependencies` in the package's `package.json`, add a changeset. If it's in `devDependencies`, skip it.

Run `pnpm changeset` from the repo root to create one.

## Catalog validation

Any PR that touches `pnpm-workspace.yaml` triggers `ci-catalog-validation.yml`. This workflow builds and tests the entire workspace in dependency order:

1. `@common-grants/core` (checks + build + TypeSpec compile)
2. `typespec-versioning-changelog` (checks + build)
3. `@common-grants/cli` (checks + build + test)
4. `@common-grants/sdk` (checks + build + test)
5. `website` (checks + build + test)

This catches breakage that individual package CI workflows would miss, since a TypeSpec version bump can affect every downstream package simultaneously.

## Dependency audits

Audits run where dependencies actually change, plus a daily sweep of `main`.

| Workflow | Command | Blocks on | Runs when |
|----------|---------|-----------|-----------|
| `ci-catalog-validation.yml` | `pnpm audit --audit-level=moderate` | moderate and above | A PR touches `pnpm-workspace.yaml`, `pnpm-lock.yaml`, or `.github/dependabot.yml`; also `workflow_dispatch` |
| `deps-audit.yml` | `pnpm audit` | low and above | Daily at 15:00 UTC on `main`; also `workflow_dispatch`, and a PR touching the workflow itself as a smoke test |
| `ci-template-quickstart.yml`, `ci-template-express-js.yml` | `pnpm audit` | low and above | A PR touches that template |
| `ci-template-fast-api.yml`, `ci-example-california-api.yml`, `ci-example-pennsylvania-api.yml` | `poetry audit` | nothing (`continue-on-error`) | A PR touches that template or example |
| `ci-lib-pysdk.yml` | none | nothing | No audit gate today. See the Python SDK note below |

The per-package workflows (`ci-lib-*`, `ci-website-preview.yml`) do **not** audit. An advisory published against a dep already on `main` would otherwise fail every open PR for that package, with no fix available from inside the PR. PRs that change a pnpm dependency are still gated: that updates the root `pnpm-lock.yaml`, which triggers `ci-catalog-validation.yml`.

**The Python SDK is not covered.** `lib/python-sdk` resolves its dependencies through its own `lib/python-sdk/poetry.lock`, which no workflow watches and which `pnpm audit` cannot see, so its `package.json` contributes nothing to the audit graph (it exists only for Changesets detection). A Dependabot bump there passes through with no advisory check, and the daily sweep does not reach it. `common-grants-sdk` publishes to PyPI, so this is a real gap rather than a scoping choice.

When the audit step in the daily sweep fails it opens an issue labeled `audit-sweep` and `dependencies`, or comments on the open one, so advisories that land with no dependency PR in flight surface within a day instead of waiting for the next unrelated PR to trip over them. It never closes that issue: once the advisory is resolved or ignored the comments stop, and closing is a manual step.

The Python template and examples are non-blocking because they are manually maintained (see [Maintenance tiers](#maintenance-tiers)) — no automated PR is queued to fix what a blocking audit would flag.

**Advisories with no upstream fix.** The default remedy is a version floor in `pnpm-workspace.yaml` under `overrides:`. Reach for an audit ignore only when no patched version exists anywhere:

```yaml
audit:
  ignore:
    - GHSA-xxxx-yyyy-zzzz
```

`audit.ignore` replaced `auditConfig.ignoreGhsas` in pnpm 11.16.0. The old spelling still works but is deprecated, and pnpm ignores it with a warning if both are set, so new entries use `audit.ignore`.

Suppressing a GHSA is a deferral, not a resolution, so every ignore entry needs both of these before it lands:

1. **An upstream issue to watch.** If the vulnerable package's own repo already has an issue tracking the fix, link that. If it doesn't, open one there first, then link it.
2. **A tracking issue in this repo**, labeled `dependencies`, referencing the GHSA and that upstream issue. It stays open until the fix ships, at which point it covers bumping the dep and removing the ignore entry.

The entry itself carries a comment naming the advisory and linking the tracking issue, so the exit condition is visible where the suppression lives. An ignore entry with no tracking issue behind it is a hole nobody is watching.

## Adding a new workspace package

1. Add the package directory to `pnpm-workspace.yaml` under `packages:`
2. If the package uses catalog deps, no extra steps needed — it inherits from the catalog automatically
3. If the package has non-catalog deps that Dependabot should track, they'll be picked up automatically by the root workspace entry
4. If the package has its own isolated lockfile (like `lib/python-sdk`), add a new entry to `.github/dependabot.yml` under World B
5. New templates and examples should not be added to Dependabot; they follow the manual maintenance tier

## Adding a new catalog dep

1. Add the dep to `pnpm-workspace.yaml` under `catalog:` (or `catalogs: website:` for website-only deps)
2. Add the package to the `ignore:` list in `.github/dependabot.yml` under the root workspace entry (World A)

CI validates that every catalog dep has a matching Dependabot ignore entry — it will fail if you forget step 2.

When **removing** a catalog dep, update the same two files in reverse. If you forget to remove it from the `ignore:` list, Dependabot will silently skip it even after it's no longer catalog-managed.

## Troubleshooting

**Dependabot PR fails CI with lockfile errors**
The dep is probably catalog-managed but missing from the ignore list in `.github/dependabot.yml`. Close the PR, add the dep to the ignore list, then let the catalog workflow handle it.

**Catalog workflow PR fails CI**
Check the `ci-catalog-validation` job logs. A TypeSpec major version bump is the most common cause — review the TypeSpec changelog and update any breaking API usage before merging.

**`create-pull-request` action fails with permission error**
The `GITHUB_TOKEN` used by the catalog workflow has `contents: write` and `pull-requests: write` permissions. If it fails, check that branch protection rules aren't blocking the token. Note: `GITHUB_TOKEN` cannot push to Dependabot-owned branches (GitHub restriction since Dec 2021), which is another reason catalog deps need their own workflow.

**Dependabot opens a PR for an internal `@common-grants/*` package**
This shouldn't happen — internal deps are in the ignore list. If it does, check that the dep name matches the ignore pattern exactly.

## Known issues

Dependabot's pnpm catalog support is tracked in these upstream issues:
- [dependabot-core #14339](https://github.com/dependabot/dependabot-core/issues/14339) (primary)
- [#13347](https://github.com/dependabot/dependabot-core/issues/13347), [#12244](https://github.com/dependabot/dependabot-core/issues/12244), [#12445](https://github.com/dependabot/dependabot-core/issues/12445), [#13000](https://github.com/dependabot/dependabot-core/issues/13000)

Once these are resolved, the catalog workflow and its ignore list can be removed, and Dependabot can manage everything directly. The split strategy is a workaround, not a permanent design.
