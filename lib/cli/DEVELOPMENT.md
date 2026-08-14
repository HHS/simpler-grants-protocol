# CommonGrants CLI development guide

This document provides instructions for common development tasks in the CommonGrants CLI.

## Overview

The CommonGrants CLI is a command-line tool that provides a set of commands for working with the CommonGrants protocol. It is designed to be used by developers to streamline and validate their adoption of the protocol.

## Development commands

| Command                | Description                                                         |
| ---------------------- | ------------------------------------------------------------------- |
| `npm install`          | Installs dependencies                                               |
| `npm run build`        | Compiles TypeScript and runs typespec compilation                   |
| `npm run typespec`     | Run the TypeSpec compiler to generate OpenAPI specs                 |
| `npm run start`        | Start the CLI application                                           |
| `npm run dev`          | Start development server with ts-node                               |
| `npm run prepare`      | Run TypeScript compilation (pre-install hook)                       |
| `npm run test`         | Run vi test suite                                                   |
| `npm run test:watch`   | Run vi test suite in watch mode                                     |
| `npm run lint`         | Run ESLint with automatic fixes                                     |
| `npm run format`       | Run automatic formatting and fix issues                             |
| `npm run check:lint`   | Check linting, fail if issues are found                             |
| `npm run check:format` | Check formatting, fail if issues are found                          |
| `npm run checks`       | Run all CI checks listed above                                      |
| `npm pack`             | Creates a tarball of the library to simulate installing it from npm |

## Release runbook

Steps to follow when preparing a new release of the CommonGrants core library.

### Pre-release checklist

- [ ] Before merging:
  - [ ] If commands were added or changed
    - [ ] The [`README.md` usage section](README.md#usage) has been updated to include them
    - [ ] The [man page](./man/cg.1) has been updated to include them
  - [ ] `npm pack` has been run, the package has been installed in a new directory outside this repo, and all the commands listed in the [README](README.md#usage) have been tested
  - [ ] (Optional) A pre-release of the new version with an `alpha`, `beta`, or `rc` tag has been manually published to test the installation from npm
  - [ ] The PR title uses the [conventional commit type](../README.md#step-2-title-your-pr-with-a-conventional-commit) matching the intended release impact (`fix` = patch, `feat` = minor, `!` = breaking) and meaningfully summarizes the change
- [ ] After merging:
  - [ ] The [Release Please](https://github.com/HHS/simpler-grants-protocol/actions/workflows/release-please.yml) workflow ran and updated (or opened) the `@common-grants/cli` Release PR

### Release checklist

- [ ] The `@common-grants/cli` Release PR has been merged — this tags the release, creates the [GitHub release](https://github.com/HHS/simpler-grants-protocol/releases), and publishes to npm automatically
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
  - [ ] [California API example Makefile](../../examples/ca-opportunity-example/Makefile)
