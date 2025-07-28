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

Steps to update this template after a new version of the [Python SDK](../../lib/python-sdk/README.md) has been released.

### Template updates checklist

- [ ] I've updated [`pyproject.toml`](pyproject.toml) to use the latest version of the Python SDK
- [ ] I've added support for all new required or optional routes
- [ ] All code quality checks, including the CommonGrants CLI `cg check spec` command are passing
- [ ] I've updated the `fast-api` section of [`template.json`](../template.json) to include all relevant paths
- [ ] I've initialized a new project from the feature branch version of this template using `tsp init <path-to-raw-template.json> --template fast-api`

### Website updates checklist

- [ ] I've reviewed and updated the Python tab for the following sections of the protocol docs, if they reference the FastAPI template:
  - [ ] [Types](../../website/src/content/docs/protocol/types/)
  - [ ] [Fields](../../website/src/content/docs/protocol/fields/)
  - [ ] [Models](../../website/src/content/docs/protocol/models/)
  - [ ] [Filters](../../website/src/content/docs/protocol/filters/)
  - [ ] [Responses](../../website/src/content/docs/protocol/responses/)
  - [ ] [Pagination](../../website/src/content/docs/protocol/pagination.mdx)
  - [ ] [Sorting](../../website/src/content/docs/protocol/sorting.mdx)
- [ ] I've successfully completed the steps in the [Python user guide](../../website/src/content/docs/guides/using-python.mdx) afer initializing a project with the feature branch template
