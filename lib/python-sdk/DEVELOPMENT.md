# Development Guide

This document provides instructions for common development tasks in the CommonGrants Python SDK.

## Prerequisites

- Python 3.11 or higher
- Poetry for dependency management

## Development Commands

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
