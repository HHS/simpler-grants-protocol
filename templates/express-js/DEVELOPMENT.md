# Express.js template development guide

## Development commands

| Command                | Action                                                           |
| :--------------------- | :--------------------------------------------------------------- |
| `npm install`          | Installs dependencies                                            |
| `npm run build`        | Compiles TypeScript code to JavaScript                           |
| `npm run clean`        | Removes dist and generated directories                           |
| `npm run typespec`     | Compile and emit TypeSpec outputs (i.e. OpenAPI and JSON schema) |
| `npm run dev`          | Start development server with hot reload                         |
| `npm run start`        | Start production server                                          |
| `npm run test`         | Run Jest test suite                                              |
| `npm run prepare`      | Run typespec compilation and build (pre-install hook)            |
| `npm run lint`         | Run ESLint with automatic fixes                                  |
| `npm run format`       | Run automatic formatting and fix issues                          |
| `npm run check:lint`   | Check linting, fail if issues are found                          |
| `npm run check:format` | Check formatting, fail if issues are found                       |
| `npm run checks`       | Run all CI checks listed above                                   |

## Release runbook

Steps to update this template after a new version of the [core library](../../lib/core/README.md) has been released.

- [ ] I've updated [`package.json`](package.json) to use the latest version of the `@common-grants/core` library
- [ ] I've updated the [`schemas/`](src/api/schemas/) sections to match the latest CommonGrants schemas
- [ ] I've added all required and optional routes to [`controllers/`](src/api/controllers/)
- [ ] All CI checks are passing
- [ ] I've updated the `quickstart` section of [template.json](../template.json) to include all relevant paths
- [ ] I've initialized a new project from the feature branch version of this template using `tsp init <path-to-raw-template.json> --template express-js`
- [ ] I've successfully completed the steps in the [TypeScript user guide](../../website/src/content/docs/guides/using-typescript.mdx) after initializing a project with the feature branch template
