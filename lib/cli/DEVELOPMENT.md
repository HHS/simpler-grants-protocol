# CommonGrants CLI development guide

This document provides instructions for common development tasks in the CommonGrants CLI.

## Overview

The CommonGrants CLI is a command-line tool that provides a set of commands for working with the CommonGrants protocol. It is designed to be used by developers to streamline and validate their adoption of the protocol.

## Development commands

Run `pnpm install` once from the repo root. Then run these from `lib/cli/`, or from the repo root as `pnpm --filter @common-grants/cli run <script>`.

| Command                  | Description                                                                  |
| ------------------------ | ---------------------------------------------------------------------------- |
| `pnpm run build`         | Regenerates the bundled OpenAPI specs (`typespec`), then compiles TypeScript |
| `pnpm run typespec`      | Regenerates the bundled OpenAPI specs in `lib/openapi/`                      |
| `pnpm run start`         | Start the CLI application                                                    |
| `pnpm run dev`           | Start development server with ts-node                                        |
| `pnpm run prepare`       | Run TypeScript compilation only (runs on `pnpm install`)                     |
| `pnpm run test`          | Run Vitest test suite                                                        |
| `pnpm run test:watch`    | Run Vitest test suite in watch mode                                          |
| `pnpm run test:coverage` | Run Vitest with coverage report                                              |
| `pnpm run lint`          | Run ESLint with automatic fixes                                              |
| `pnpm run format`        | Run automatic formatting and fix issues                                      |
| `pnpm run check:lint`    | Check linting, fail if issues are found                                      |
| `pnpm run check:format`  | Check formatting, fail if issues are found                                   |
| `pnpm run check:types`   | Check types, fail if issues are found                                        |
| `pnpm run checks`        | Run all the checks listed above                                              |
| `pnpm run ci`            | Run the checks, build and tests that CI runs                                 |
| `pnpm pack`              | Creates a tarball of the library to simulate installing it from npm          |

`pnpm install` compiles the CLI, so you can run it from the repo root with `node lib/cli/dist/index.js <command>`. Don't use `npx` inside the repo yet; see the [core development commands](../core/DEVELOPMENT.md#development-commands).

## Bundled specs

The CLI bundles a copy of each protocol version's OpenAPI spec in [`lib/openapi/`](lib/openapi/), and `cg check spec --protocol-version` can only select versions bundled there. The `build` script runs `typespec`, which recompiles those specs from the workspace copy of `@common-grants/core`. So any CLI build regenerates them from the latest core spec, and once those files are committed, even an unrelated fix ships them.

After a core release, ship the new version in a minor CLI release:

1. Make sure the next PR that touches `lib/cli` uses a `feat` title (for example `feat(cli): bundle protocol v<new-version> spec`), never `fix`. It can be a dedicated PR or ride along with other CLI work.
2. Run `pnpm --filter @common-grants/cli run typespec` and commit the new `lib/cli/lib/openapi/openapi.<new-version>.yaml`, plus any bundled specs that changed.
3. Follow the [release runbook](#release-runbook) below.

It doesn't have to ship with core, but don't let the CLI fall several core versions behind.

Whether to take `typespec` out of the CLI `build` script is an open decision, tracked in [#1286](https://github.com/HHS/simpler-grants-protocol/issues/1286).

## Release runbook

Steps to follow when preparing a new release of the CommonGrants CLI. Feature work that ships with a minor release follows [Hold branches](../README.md#hold-branches) and [Releasing from a hold branch](../README.md#releasing-from-a-hold-branch).

### Pre-release checklist

- [ ] Before merging the PR that triggers the release:
  - [ ] If commands were added or changed
    - [ ] The [`README.md` usage section](README.md#usage) has been updated to include them
    - [ ] The [man page](./man/cg.1) has been updated to include them
  - [ ] If this is the first CLI release since a core release, `lib/openapi/` includes the new protocol version's spec, and `cg check spec --protocol-version <new-version>` works
  - [ ] `pnpm --filter @common-grants/cli pack --pack-destination <dir-outside-repo>` has been run, the package has been installed in that directory, and all the commands listed in the [README](README.md#usage) have been tested
  - [ ] (Optional) A pre-release of the new version with an `alpha`, `beta`, or `rc` tag has been manually published to test the installation from npm
  - [ ] The PR title uses the [conventional commit type](../README.md#step-2-title-your-pr-with-a-conventional-commit) matching the intended release impact (`fix` = patch, `feat` = minor, `!` = breaking) and meaningfully summarizes the change
- [ ] After merging that PR:
  - [ ] The [Release Please](https://github.com/HHS/simpler-grants-protocol/actions/workflows/cd-release.yml) workflow ran and updated (or opened) the `@common-grants/cli` Release PR

### Release checklist

- [ ] The `@common-grants/cli` Release PR has been merged. This tags the release, creates the [GitHub release](https://github.com/HHS/simpler-grants-protocol/releases), and publishes to npm automatically.
- [ ] The auto-generated release notes are accurate
- [ ] The new version appears on [npm](https://www.npmjs.com/package/@common-grants/cli)

### Post-release checklist

- [ ] If the `init` command was updated, references to that command in the following locations have been updated:
  - [ ] [`templates/README.md`](../../templates/README.md)
  - [ ] [Fast API template README](../../templates/fast-api/README.md)
  - [ ] [Express.js template README](../../templates/express-js/README.md)
  - [ ] [Quickstart guide](../../website/src/content/docs/getting-started.mdx)
  - [ ] [Using Python](../../website/src/content/docs/guides/using-python.mdx)
  - [ ] [Using TypeScript](../../website/src/content/docs/guides/using-typescript.mdx)
- [ ] If the `check spec` command was updated, references to that command in the following locations have been updated:
  - [ ] [FastAPI template Makefile](../../templates/fast-api/Makefile)
