# CommonGrants core library development guide

## Overview

The CommonGrants core library is a TypeSpec library that defines the core models and routes for the CommonGrants protocol. It is designed to be imported and extended by individual implementations of the CommonGrants protocol.

## Release runbook

Steps to follow when preparing a new release of the CommonGrants core library.

### Development checklist

- [ ] For major or minor updates:
  - [ ] I've added a new version to the `Versions` enum in [`main.tsp`](lib/main.tsp)
  - [ ] I've decorated all updated routes, models, etc. with their corresponding [versioning decorators](https://typespec.io/docs/libraries/versioning/reference/decorators/#@TypeSpec.Versioning.removed)
- [ ] I've run `npm typespec` to auto-generate the OpenAPI spec outputs and done the following for each spec version:
  - [ ] Run `cg preview <path-to-spec>` and reviewed the Swagger docs for that version
  - [ ] Compared each version to its equivalent in the [website/public/openapi](../../website/public/openapi/) directory using `diff` to confirm we applied the versioning decorators correctly
- [ ] I've run `npm pack`, installed the package in a new directory outside this repo, and completed the quickstart guide in the [README](README.md)

### Pre-release checklist

- [ ] Before merging:
  - [ ] (Optional) I've manually published a pre-release of the new version with an `alpha`, `beta`, or `rc` tag to test the changes
  - [ ] I've [created a changeset](../README.md#step-2-generate-a-changeset) with the correct revision type (MAJOR, MINOR, PATCH) and a meaningful summary of the changes made in this version
- [ ] After merging:
  - [ ] The [CI - Bump Version & Create Tag](https://github.com/HHS/simpler-grants-protocol/actions/workflows/ci-bump-version.yml) GitHub action ran successfully
  - [ ] A new `@common-grants/core` tag was created for this new version
  - [ ] A new `@common-grants/cli` tag was created with a patch update

### Release checklist

- [ ] For the core library release:
  - [ ] I've manually triggered the [CD - Deploy Core Package to npm](https://github.com/HHS/simpler-grants-protocol/actions/workflows/cd-deploy-lib-core.yml) with the new `@common-grants/core` tag
  - [ ] A new [GitHub release](https://github.com/HHS/simpler-grants-protocol/releases) has been created, and the auto-generated release notes are accurate.
  - [ ] The new version appears on [npm](https://www.npmjs.com/package/@common-grants/core)
- [ ] For CLI patch release (after the core library is released):
  - [ ] I've manually triggered the [CD - Deploy CLI Package to npm](https://github.com/HHS/simpler-grants-protocol/actions/workflows/cd-deploy-lib-cli.yml) with the new `@common-grants/cli` tag
  - [ ] A new [GitHub release](https://github.com/HHS/simpler-grants-protocol/releases) has been created, and the auto-generated release notes are accurate
  - [ ] The new version appears on [npm](https://www.npmjs.com/package/@common-grants/cli)

### Post-release checklist

- [ ] Website updates:
  - [ ] I've updated website's [`package.json`](../../website/package.json) and [`package-lock.json`](../../website/package-lock.json) to use the latest version
  - [ ] I've run `npm run typespec` and updated the [`public/`](../../website/public/) directory with the auto-generated OpenAPI specs and JSON schemas
  - [ ] I've reviewed and updated the table and format sections for the following sections of the protocol docs:
    - [ ] [Types](../../website/src/content/docs/protocol/types/)
    - [ ] [Fields](../../website/src/content/docs/protocol/fields/)
    - [ ] [Models](../../website/src/content/docs/protocol/models/)
    - [ ] [Filters](../../website/src/content/docs/protocol/filters/)
    - [ ] [Responses](../../website/src/content/docs/protocol/responses/)
    - [ ] [Pagination](../../website/src/content/docs/protocol/pagination.mdx)
    - [ ] [Sorting](../../website/src/content/docs/protocol/sorting.mdx)
- [ ] SDK and template updates:
  - [ ] I've updated the [**Quickstart template**](../../templates/quickstart/DEVELOPMENT.md) and guide
  - [ ] I've updated the [**Python SDK**](../python-sdk/DEVELOPMENT.md#release-runbook) and released a new version
  - [ ] I've updated the [**FastAPI template**](../../templates/fast-api/DEVELOPMENT.md)
  - [ ] I've updated the [**Express.js template**](../../templates/express-js/DEVELOPMENT.md)
