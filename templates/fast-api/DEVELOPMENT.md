# FastAPI template development guide

This document provides instructions for common development tasks in the FastAPI template.

## Development commands

| Command             | Description                                                                     |
| ------------------- | ------------------------------------------------------------------------------- |
| `make install`      | Installs the python dependencies and API                                        |
| `make test`         | Runs the unit test suite and test coverage                                      |
| `make format`       | Runs formatting with black                                                      |
| `make lint`         | Runs linting with ruff                                                          |
| `make check-format` | Check formatting with black, fail if any files are not formatted                |
| `make check-lint`   | Check linting with ruff, fail if any files are not linted                       |
| `make check-types`  | Runs type checking with pyright                                                 |
| `make checks`       | Runs linting, formatting, and type checking, fail if any checks are not passing |
| `make check-spec`   | Validates the OpenAPI specification                                             |
| `make dev`          | Runs the development server                                                     |
| `make gen-openapi`  | Generates the OpenAPI specification                                             |

## Release runbook

Steps to follow when a new version of the [Python SDK](../../lib/python-sdk/README.md) or [core library](../../lib/core/README.md) has been released.

### Development checklist - FastAPI template

- [ ] [`pyproject.toml`](pyproject.toml) has been updated to use the latest version of the Python SDK
- [ ] Support has been added for all required or optional routes defined by the core library
- [ ] All CI checks are passing (e.g. `make checks` and `make check-spec`)
- [ ] The `fast-api` section of [`template.json`](../template.json) includes paths for all files that should be copied when initializing a new project. **Note:** This should be most, if not all, files in the template (e.g. python files, `pyproject.toml`, `Makefile`, etc.) but not `poetry.lock`. For more information see the [TypeSpec scaffolding docs](https://typespec.io/docs/extending-typespec/writing-scaffolding-template/#adding-new-files).
- [ ] A new project has been initialized from the feature branch version of this template using `tsp init <path-to-raw-template.json> --template fast-api`

### Development checklist - Website documentation

- [ ] The Python tab has been reviewed and updated for the following sections of the protocol docs, if they reference the FastAPI template:
  - [ ] [Types](../../website/src/content/docs/protocol/types/)
  - [ ] [Fields](../../website/src/content/docs/protocol/fields/)
  - [ ] [Models](../../website/src/content/docs/protocol/models/)
  - [ ] [Filters](../../website/src/content/docs/protocol/filters/)
  - [ ] [Responses](../../website/src/content/docs/protocol/responses/)
  - [ ] [Pagination](../../website/src/content/docs/protocol/pagination.mdx)
  - [ ] [Sorting](../../website/src/content/docs/protocol/sorting.mdx)
- [ ] The steps in the [Python user guide](../../website/src/content/docs/guides/using-python.mdx) have been successfully completed after initializing a project with the feature branch template
