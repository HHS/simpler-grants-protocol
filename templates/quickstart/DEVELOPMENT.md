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

Steps to follow when a new version of the [core library](../../lib/core/README.md) has been released.

- [ ] [`package.json`](package.json) has been updated to use the latest version of the `@common-grants/core` library
- [ ] All required and optional routes defined by the core library have been added to [`routes.tsp`](routes.tsp)
- [ ] All CI checks are passing (e.g. `npm run checks`, `npm run typespec`)
- [ ] The `quickstart` section of [`template.json`](../template.json) includes paths for all files that should be copied when initializing a new project. **Note:** This should be most, if not all, files in the template (e.g. TypeSpec files, `tspconfig.yaml`, `package.json`, etc.) but not `package-lock.json`. For more information see the [TypeSpec scaffolding docs](https://typespec.io/docs/extending-typespec/writing-scaffolding-template/#adding-new-files).
- [ ] A new project has been initialized from the feature branch version of this template using `tsp init <path-to-raw-template.json> --template quickstart`
- [ ] The steps in the [Quickstart guide](../../website/src/content/docs/getting-started.mdx#quickstart) have been successfully completed after initializing a project with the feature branch template
