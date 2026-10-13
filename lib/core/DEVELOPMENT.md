# CommonGrants core library development guide

This document provides instructions for common development tasks in the CommonGrants core library.

## Overview

The CommonGrants core library is a TypeSpec library that defines the core models and routes for the CommonGrants protocol. It is designed to be imported and extended by individual implementations of the CommonGrants protocol.

## Development commands

Run `pnpm install` once from the repo root. Then run these from `lib/core/`, or from the repo root as `pnpm --filter @common-grants/core run <script>`.

| Command                 | Description                                                               |
| ----------------------- | ------------------------------------------------------------------------- |
| `pnpm run clean`        | Removes dist and tsp-output directories                                   |
| `pnpm run build`        | Compiles TypeScript code to JavaScript                                    |
| `pnpm run typespec`     | Runs the TypeSpec compiler to generate the OpenAPI specs and JSON schemas |
| `pnpm run prepare`      | Run build (pre-install hook)                                              |
| `pnpm run lint`         | Run ESLint with automatic fixes                                           |
| `pnpm run format`       | Run automatic formatting and fix issues                                   |
| `pnpm run check:lint`   | Check linting, fail if issues are found                                   |
| `pnpm run check:format` | Check formatting, fail if issues are found                                |
| `pnpm run check:types`  | Check types, fail if issues are found                                     |
| `pnpm run checks`       | Run all the checks listed above                                           |
| `pnpm run ci`           | Run the checks, build and typespec steps that CI runs                     |
| `pnpm pack`             | Creates a tarball of the library to simulate installing it from npm       |

Don't run `npx` inside the repo until [#1288](https://github.com/HHS/simpler-grants-protocol/issues/1288) lands. It fails with `EDUPLICATEWORKSPACE`. Use `pnpm dlx <pkg>` or a local binary instead.

## Release runbook

Minor and major core releases go through a hold branch. Follow [Hold branches](../README.md#hold-branches) and [Releasing from a hold branch](../README.md#releasing-from-a-hold-branch) for the shared steps. This section covers only the core-specific checks.

### Development checklist

For each PR into the hold branch:

- [ ] For major or minor updates:
  - [ ] A new version has been added to the `Versions` enum in [`main.tsp`](lib/main.tsp)
  - [ ] All updated routes, models, etc. have been decorated with their corresponding [versioning decorators](https://typespec.io/docs/libraries/versioning/reference/decorators/#@TypeSpec.Versioning.removed)
- [ ] `pnpm --filter website run typespec` has been run, and the regenerated files in [`website/public/openapi/`](../../website/public/openapi/) and [`website/public/schemas/yaml/`](../../website/public/schemas/yaml/) are committed

### Pre-release checklist

This is the release review. Run it on the hold branch before merging the staging PR, and note the results on the staging PR.

- [ ] The hold branch is synced with `main`, and CI is green on the staging PR
- [ ] Regenerated specs match the committed files: after `pnpm --filter website run typespec`, `git status` shows no changes
- [ ] Older versions are unchanged except for intended edits:
  - [ ] `git fetch origin` and `git diff origin/main...<hold-branch> -- website/public/openapi/` have been run
  - [ ] The diff adds `openapi.<new-version>.yaml`, and older versions show only edits you meant to make, such as a description or example fix
  - Comparing against `main` is what confirms the versioning decorators. Don't diff `lib/core/tsp-output/` against `website/public/openapi/`: the website build prunes unused tags (`website/src/scripts/prune-openapi-tags.ts`), so v0.1.0 to v0.3.0 always differ.
- [ ] The new version has been reviewed in Swagger with `cg preview`:
  - [ ] From the repo root: `node lib/cli/dist/index.js preview website/public/openapi/openapi.<new-version>.yaml` (`pnpm install` builds the CLI), or `pnpm dlx @common-grants/cli preview <spec>`
  - [ ] The previous version has no new-version fields, schemas or example values
- [ ] The package installs and works outside the repo:
  - [ ] `pnpm --filter @common-grants/core pack --pack-destination <dir-outside-repo>` has been run, and the tarball has been installed in that directory with `npm install ./common-grants-core-<version>.tgz`
  - If npm reports `ERESOLVE`, the package's TypeSpec peer ranges don't match the latest TypeSpec release. Users will hit this too, so file an issue, then install the matching `@typespec/*` versions alongside the tarball to finish the check.
  - [ ] The [README](README.md) quickstart compiles at the new version (set `@Versioning.useDependency` to the new version). The README ships in the npm package.
- [ ] The website preview (linked in a comment on the staging PR) has been reviewed:
  - [ ] Model tables and per-model changelogs list every change in the release. A model's changelog records only its own direct properties. Changes to nested or inherited fields show on those models' changelogs.
  - [ ] The table and format sections are up to date for [Types](../../website/src/content/docs/protocol/types/), [Fields](../../website/src/content/docs/protocol/fields/), [Models](../../website/src/content/docs/protocol/models/), [Filters](../../website/src/content/docs/protocol/filters/), [Responses](../../website/src/content/docs/protocol/responses/), [Pagination](../../website/src/content/docs/protocol/pagination.mdx) and [Sorting](../../website/src/content/docs/protocol/sorting.mdx)
  - [ ] Light mode, dark mode and phone width all look right
- [ ] If the staging PR also touches another package (for example `lib/ts-sdk/`), the team has agreed whether its Release PR ships alongside core. See [SDK changes](../README.md#sdk-changes).
- [ ] (Optional) A pre-release of the new version with an `alpha`, `beta`, or `rc` tag has been manually published to test the installation from npm
- [ ] The staging PR title is `feat(core): ...`, or `feat(core)!: ...` if the release has breaking changes

### Release checklist

- [ ] The staging PR has been squash-merged, and the [Release Please](https://github.com/HHS/simpler-grants-protocol/actions/workflows/cd-release.yml) workflow opened or updated the `@common-grants/core` Release PR
- [ ] The `@common-grants/core` Release PR has been merged. This tags the release, creates the [GitHub release](https://github.com/HHS/simpler-grants-protocol/releases), and publishes to npm automatically.
- [ ] The auto-generated release notes are accurate
- [ ] The new version appears on [npm](https://www.npmjs.com/package/@common-grants/core)

### Post-release checklist

- [ ] Website updates:
  - [ ] No dependency bump is needed. The website uses the workspace copy of core (`"@common-grants/core": "workspace:*"`), and its specs were regenerated in the hold branch PRs.
  - [ ] The [CD - Deploy Website](https://github.com/HHS/simpler-grants-protocol/actions/workflows/cd-deploy-website.yml) run for the merge succeeded, and [commongrants.org](https://commongrants.org) shows the new version
- [ ] CLI follow-up:
  - [ ] The CLI bundles a spec for each protocol version in [`lib/cli/lib/openapi/`](../cli/lib/openapi/), so it needs a release that ships the new version. The next CLI release after a core release must use a `feat(cli): ...` title (minor), never a `fix`. See the [CLI release runbook](../cli/DEVELOPMENT.md#release-runbook).
  - It doesn't have to ship right away, but don't let the CLI fall several core versions behind.
- [ ] SDK and template updates:
  - [ ] The [**Quickstart template**](../../templates/quickstart/DEVELOPMENT.md) and guide have been updated
  - [ ] The [**Python SDK**](../python-sdk/DEVELOPMENT.md#release-runbook) has been updated and a new version has been released
  - [ ] The [**FastAPI template**](../../templates/fast-api/DEVELOPMENT.md) has been updated
  - [ ] The [**Express.js template**](../../templates/express-js/DEVELOPMENT.md) has been updated
- [ ] The milestone is closed, the hold branch is deleted, and any issues fixed through the hold branch are closed by hand
