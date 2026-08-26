# CommonGrants core library development guide

This document provides instructions for common development tasks in the CommonGrants core library.

## Overview

The CommonGrants core library is a TypeSpec library that defines the core models and routes for the CommonGrants protocol. It is designed to be imported and extended by individual implementations of the CommonGrants protocol.

## Development commands

| Command                | Description                                                               |
| ---------------------- | ------------------------------------------------------------------------- |
| `npm install`          | Installs dependencies                                                     |
| `npm run clean`        | Removes dist and tsp-output directories                                   |
| `npm run build`        | Compiles TypeScript code to JavaScript                                    |
| `npm run typespec`     | Runs the TypeSpec compiler to generate the OpenAPI specs and JSON schemas |
| `npm run prepare`      | Run build (pre-install hook)                                              |
| `npm run lint`         | Run ESLint with automatic fixes                                           |
| `npm run format`       | Run automatic formatting and fix issues                                   |
| `npm run check:lint`   | Check linting, fail if issues are found                                   |
| `npm run check:format` | Check formatting, fail if issues are found                                |
| `npm run checks`       | Run all CI checks listed above                                            |
| `npm pack`             | Creates a tarball of the library to simulate installing it from npm       |

## Release runbook

Steps to follow when preparing a new release of the CommonGrants core library.

### Development checklist

- [ ] For major or minor updates:
  - [ ] A new version has been added to the `Versions` enum in [`main.tsp`](lib/main.tsp)
  - [ ] All updated routes, models, etc. have been decorated with their corresponding [versioning decorators](https://typespec.io/docs/libraries/versioning/reference/decorators/#@TypeSpec.Versioning.removed)
- [ ] `npm typespec` has been run to auto-generate the OpenAPI spec outputs and the following has been completed for each spec version:
  - [ ] `cg preview <path-to-spec>` has been run and the Swagger docs for that version have been reviewed
  - [ ] Each version has been compared to its equivalent in the [website/public/openapi](../../website/public/openapi/) directory using `diff` to confirm the versioning decorators were applied correctly
- [ ] `npm pack` has been run, the package has been installed in a new directory outside this repo, and the quickstart guide in the [README](README.md) has been completed

### Pre-release checklist

- [ ] Before merging:
  - [ ] (Optional) A pre-release of the new version with an `alpha`, `beta`, or `rc` tag has been manually published to test the installation from npm
  - [ ] The PR title uses the [conventional commit type](../README.md#step-2-title-your-pr-with-a-conventional-commit) matching the intended release impact (`fix` = patch, `feat` = minor, `!` = breaking) and meaningfully summarizes the change
  - [ ] If the change affects the CLI's vendored spec output, the regenerated [`lib/cli/lib/openapi/`](../cli/lib/openapi/) files are included in the PR — touching those paths is what carries the change into the next CLI release
- [ ] After merging:
  - [ ] The [Release Please](https://github.com/HHS/simpler-grants-protocol/actions/workflows/cd-release.yml) workflow ran and updated (or opened) the `@common-grants/core` Release PR — and the `@common-grants/cli` Release PR if CLI files were touched

### Release checklist

- [ ] For the core library release:
  - [ ] The `@common-grants/core` Release PR has been merged — this tags the release, creates the [GitHub release](https://github.com/HHS/simpler-grants-protocol/releases), and publishes to npm automatically
  - [ ] The auto-generated release notes are accurate
  - [ ] The new version appears on [npm](https://www.npmjs.com/package/@common-grants/core)
- [ ] For a CLI release (after the core library is released):
  - [ ] The `@common-grants/cli` Release PR has been merged and the new version appears on [npm](https://www.npmjs.com/package/@common-grants/cli)

### Post-release checklist

- [ ] Website updates:
  - [ ] The website's [`package.json`](../../website/package.json) and [`package-lock.json`](../../website/package-lock.json) have been updated to use the latest version
  - [ ] `npm run typespec` has been run and the [`public/`](../../website/public/) directory has been updated with the auto-generated OpenAPI specs and JSON schemas
  - [ ] The table and format sections have been reviewed and updated for the following sections of the protocol docs:
    - [ ] [Types](../../website/src/content/docs/protocol/types/)
    - [ ] [Fields](../../website/src/content/docs/protocol/fields/)
    - [ ] [Models](../../website/src/content/docs/protocol/models/)
    - [ ] [Filters](../../website/src/content/docs/protocol/filters/)
    - [ ] [Responses](../../website/src/content/docs/protocol/responses/)
    - [ ] [Pagination](../../website/src/content/docs/protocol/pagination.mdx)
    - [ ] [Sorting](../../website/src/content/docs/protocol/sorting.mdx)
- [ ] SDK and template updates:
  - [ ] The [**Quickstart template**](../../templates/quickstart/DEVELOPMENT.md) and guide have been updated
  - [ ] The [**Python SDK**](../python-sdk/DEVELOPMENT.md#release-runbook) has been updated and a new version has been released
  - [ ] The [**FastAPI template**](../../templates/fast-api/DEVELOPMENT.md) has been updated
  - [ ] The [**Express.js template**](../../templates/express-js/DEVELOPMENT.md) has been updated
