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
| `pnpm run prepare`      | Run build (runs on `pnpm install`)                                        |
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

Patch releases skip the hold branch: `fix(core)` PRs go straight to `main`. Run the release review checks that apply (pack and install, quickstart, `cg preview`) and the release checklist.

### Development checklist

- [ ] For major or minor updates:
  - [ ] The first PR into the hold branch adds the new version to the `Versions` enum in [`main.tsp`](lib/main.tsp)
  - [ ] Every PR decorates what it changes with the matching [versioning decorators](https://typespec.io/docs/libraries/versioning/reference/decorators/#@TypeSpec.Versioning.removed)
- [ ] Every core PR runs `pnpm --filter website run typespec` and commits the regenerated files in [`website/public/openapi/`](../../website/public/openapi/) and [`website/public/schemas/yaml/`](../../website/public/schemas/yaml/)

### Release review checklist

Run this on the hold branch before merging the staging PR, and note the results on the staging PR.

- [ ] Regenerated specs match the committed files: after `pnpm --filter website run typespec`, `git status` shows no changes
- [ ] Older versions are unchanged except for intended edits:
  - [ ] `git fetch origin` and `git diff origin/main...origin/<hold-branch> -- website/public/openapi/` have been run
  - [ ] The diff adds `openapi.<new-version>.yaml`, and older versions show only edits you meant to make, such as a description or example fix
  - Comparing against `main` is what confirms the versioning decorators. Don't diff `lib/core/tsp-output/` against `website/public/openapi/`: the website build prunes unused tags (`website/src/scripts/prune-openapi-tags.ts`), so older versions always differ.
- [ ] The new version has been reviewed in Swagger with `cg preview`:
  - [ ] From the repo root: `node lib/cli/dist/index.js preview website/public/openapi/openapi.<new-version>.yaml` (`pnpm install` builds the CLI), or `pnpm dlx @common-grants/cli preview <spec>`
  - [ ] The previous version has no new-version fields, schemas or example values
- [ ] The package installs and works outside the repo:
  - [ ] `pnpm --filter @common-grants/core pack --pack-destination <scratch-dir>` has been run with a directory outside the repo, and in that directory `npm init -y` and `npm install ./common-grants-core-<version>.tgz` have been run. If npm reports `ERESOLVE`, also install the `@typespec/*` versions in the peer ranges in [`package.json`](package.json), and file an issue.
  - [ ] The [README](README.md) quickstart compiles at the new version (set `@Versioning.useDependency` to the new version). The README ships in the npm package.
- [ ] The website preview (linked in a comment on the staging PR) has been reviewed:
  - [ ] Model tables are up to date for [Types](../../website/src/content/docs/protocol/types/), [Fields](../../website/src/content/docs/protocol/fields/), [Models](../../website/src/content/docs/protocol/models/), [Filters](../../website/src/content/docs/protocol/filters/), [Responses](../../website/src/content/docs/protocol/responses/), [Pagination](../../website/src/content/docs/protocol/pagination.mdx) and [Sorting](../../website/src/content/docs/protocol/sorting.mdx)
  - [ ] Per-model changelogs list every change in the release
    - Today, fields inherited through `extends` aren't listed on the child model's changelog (fields pulled in with a spread are). Whether that's intended is an open question.
  - [ ] The model and changelog pages look right in light mode, dark mode and at phone width
- [ ] If the staging PR also touches another package (for example `lib/ts-sdk/`), the team has agreed whether its Release PR ships alongside core. See [SDK changes](../README.md#sdk-changes).
- [ ] (Optional) A pre-release of the new version with an `alpha`, `beta`, or `rc` tag has been manually published to test the installation from npm

### Release checklist

Follow [Releasing from a hold branch](../README.md#releasing-from-a-hold-branch), then:

- [ ] The auto-generated release notes are accurate
- [ ] The new version appears on [npm](https://www.npmjs.com/package/@common-grants/core)

### Post-release checklist

- [ ] Website updates:
  - [ ] No dependency bump is needed. The website uses the workspace copy of core (`"@common-grants/core": "workspace:*"`), and its specs were regenerated in the hold branch PRs.
  - [ ] The [CD - Deploy Website](https://github.com/HHS/simpler-grants-protocol/actions/workflows/cd-deploy-website.yml) run for the merge succeeded, and [commongrants.org](https://commongrants.org) shows the new version
- [ ] The CLI has a PR open to bundle the new version. See [Bundled specs](../cli/DEVELOPMENT.md#bundled-specs).
- [ ] SDK and template updates:
  - [ ] The [**Quickstart template**](../../templates/quickstart/DEVELOPMENT.md) and guide have been updated
  - [ ] The [**Python SDK**](../python-sdk/DEVELOPMENT.md#release-runbook) has been updated and a new version has been released
  - [ ] The [**FastAPI template**](../../templates/fast-api/DEVELOPMENT.md) has been updated
  - [ ] The [**Express.js template**](../../templates/express-js/DEVELOPMENT.md) has been updated
