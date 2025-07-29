# Development Guide

This document provides instructions for common development tasks in the CommonGrants Python SDK.

## Prerequisites

- Python 3.11 or higher
- Poetry for dependency management

## Development Commands

### Setup

The commands described in this guide should be run from the `python-sdk` directory:
```bash
cd simpler-grants-protocol/lib/python-sdk
```

Install dependencies:
```bash
poetry install
```

### Testing

Run all tests:
```bash
poetry run pytest
```

Run tests with coverage report:
```bash
poetry run pytest --cov=common_grants --cov-report=term-missing
```

### Code Quality

#### Formatting

Format code with Black:
```bash
poetry run black .
```

#### Linting

Check code with Ruff:
```bash
poetry run ruff check .
```

#### Type Checking

Verify types with MyPy:
```bash
poetry run mypy .
```

## Release runbook

Steps to follow when preparing a new release of the CommonGrants Python SDK library.

### Pre-release checklist

- [ ] Before merging: 
  - [ ] The package has been installed in a new directory, and all examples listed in the [README](README.md) have been tested
  - [ ] (Optional) A pre-release of the new version with an `alpha`, `beta`, or `rc` tag has been manually published to test the installation from PyPI
  - [ ] An API using this SDK passes the CommonGrants CLI `check spec` command
  - [ ] A [changeset](../README.md#step-2-generate-a-changeset) has been created with the correct revision type (MAJOR, MINOR, PATCH) and a meaningful summary of the changes made in this version
- [ ] After merging:
  - [ ] The [CI - Bump Version & Create Tag](https://github.com/HHS/simpler-grants-protocol/actions/workflows/ci-bump-version.yml) GitHub action ran successfully
  - [ ] A new `common-grants-sdk` [tag](https://github.com/HHS/simpler-grants-protocol/tags) was created for this new version

### Release checklist

- [ ] [CD - Deploy Python Package to npm](https://github.com/HHS/simpler-grants-protocol/actions/workflows/cd-deploy-lib-pysdk.yml) has been manually triggered with the new `common-grants-sdk` tag
- [ ] A new [GitHub release](https://github.com/HHS/simpler-grants-protocol/releases) has been created, and the auto-generated release notes are accurate.
- [ ] The new version appears on [PyPI](https://pypi.org/project/common-grants-sdk/)

### Post-release checklist

- [ ] The Python tab has been reviewed and updated for the following sections of the protocol docs:
  - [ ] [Types](../../website/src/content/docs/protocol/types/)
  - [ ] [Fields](../../website/src/content/docs/protocol/fields/)
  - [ ] [Models](../../website/src/content/docs/protocol/models/)
  - [ ] [Filters](../../website/src/content/docs/protocol/filters/)
  - [ ] [Responses](../../website/src/content/docs/protocol/responses/)
  - [ ] [Pagination](../../website/src/content/docs/protocol/pagination.mdx)
  - [ ] [Sorting](../../website/src/content/docs/protocol/sorting.mdx)
- [ ] The [**FastAPI template**](../../templates/fast-api/DEVELOPMENT.md) has been updated
- [ ] The [Python guide](../../website/src/content/docs/guides/using-python.mdx) has been updated
