## Quickstart template development guide

This document provides instructions for common development tasks in the Quickstart template.

## Development commands

| Command                | Action                                                           |
| :--------------------- | :--------------------------------------------------------------- |
| `npm install`          | Installs dependencies                                            |
| `npm run typespec`     | Compile and emit TypeSpec outputs (i.e. OpenAPI and JSON schema) |
| `npm run format`       | Run automatic formatting and fix issues                          |
| `npm run check:format` | Check formatting, fail if issues are found                       |
| `npm run checks`       | Run all CI checks listed above                                   |

## Release runbook

Steps to update this template after a new version of the [core library](../../lib/core/README.md) has been released.

- [ ] I've updated [`package.json`](package.json) to use the latest version of the `@common-grants/core` library
- [ ] I've added all required and optional routes to [`routes.tsp`](routes.tsp)
- [ ] All CI checks are passing
- [ ] I've updated the `quickstart` section of [`template.json`](../template.json) to include all relevant paths
- [ ] I've initialized a new project from the feature branch version of this template using `tsp init <path-to-raw-template.json> --template quickstart`
- [ ] I've successfully completed the steps in the [Quickstart guide](../../website/src/content/docs/getting-started.mdx#quickstart) after initializing a project with the feature branch template
