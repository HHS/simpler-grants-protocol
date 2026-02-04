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

Steps to follow after a new version of the [core library](../../lib/core/README.md) has been released.

- [ ] [`package.json`](package.json) has been updated to use the latest version of the `@common-grants/core` library
- [ ] The [`schemas/`](src/api/schemas/) sections have been updated to match the latest CommonGrants schemas
- [ ] All required and optional routes have been added to [`controllers/`](src/api/controllers/)
- [ ] All CI checks are passing (e.g. `npm run checks`, `npm run build`, and `npm audit`)
- [ ] The `express-js` section of [template.json](../template.json) includes paths for all files that should be copied when initializing a new project. **Note:** This should be most, if not all, files in the template (e.g. TypeScript and TypeSpec files, `tspconfig.yaml`, `package.json`, etc.) but not `package-lock.json`. For more information see the [TypeSpec scaffolding docs](https://typespec.io/docs/extending-typespec/writing-scaffolding-template/#adding-new-files).
- [ ] A new project has been initialized from the feature branch version of this template using `tsp init <path-to-raw-template.json> --template express-js`
- [ ] The steps in the [TypeScript user guide](../../website/src/content/docs/guides/using-typescript.mdx) have been successfully completed after initializing a project with the feature branch template



bump