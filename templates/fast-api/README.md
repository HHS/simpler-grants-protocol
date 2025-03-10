# CommonGrants FastAPI Implementation

A template for implementing a CommonGrants API using Python and FastAPI.

## Pre-requisites

1. The TypeSpec compiler and CommonGrants API are installed globally: `npm install -g @common-grants/core @typespec/compiler`
2. Python 3.11 or greater is installed globally: `python --version`
3. Poetry is installed globally: `poetry --version`

## Quickstart

1. Create a new directory for your project: `mkdir fast-api && cd fast-api`
2. Set up the project using this template and follow the instructions: `cg init --template fast-api`
3. Run install the python project dependencies: `make install`
4. Run the tests: `make test`
5. Run the local development server: `make dev`

## Commands

The Makefile exposes the following commands:

| Command               | Description                                 |
| --------------------- | ------------------------------------------- |
| `make install`        | Installs the python dependencies and API    |
| `make test`           | Runs the unit test suite and test coverage  |
| `make format`         | Runs formatting with black                  |
| `make lint`           | Runs linting with ruff                      |
| `make check-typespec` | Runs type checking with pyright             |
| `make checks`         | Runs linting, formatting, and type checking |
| `make dev`            | Runs the development server                 |

## Project Structure

```
├── pyproject.toml          # Python project configuration and dependencies
├── poetry.lock             # Locked versions of dependencies
├── Makefile                # Development workflow commands
├── README.md               # Project documentation
│
├── src/
│   └── common_grants/              # Main package directory
│       ├── api.py                  # FastAPI application setup and config
│       ├── routes/                 # API route handlers and endpoints
│       │   ├── opportunities.py    # Opportunity-related endpoints
│       │   └── ...                 # Other route modules
│       │
│       ├── schemas/                    # Data models and schema definitions
│       │   ├── fields.py               # Base field types (Money, Event, etc.)
│       │   ├── filters/                # Query filter models
│       │   │   ├── base.py             # Base filter types and operators
│       │   │   ├── date_filters.py     # Date-specific filters
│       │   │   ├── money_filters.py    # Money-specific filters
│       │   │   └── string_filters.py   # String-specific filters
│       │   ├── models/                 # Core domain models
│       │   │   ├── opp_base.py         # Base opportunity model
│       │   │   └── ...                 # Other models
│       │   ├── pagination.py           # Pagination models and parameters
│       │   ├── response.py             # API response wrappers
│       │   └── sorting.py              # Sorting models and parameters
│       │
│       └── services/               # Business logic and data operations
│           ├── opportunity.py      # Opportunity-related operations
│           └── utils.py            # Shared utility functions
│
└── tests/                  # Test suite
    └── common_grants/      # Tests matching package structure
        ├── schemas/        # Schema-related tests
        │   ├── fields/     # Field type tests
        │   ├── filters/    # Filter model tests
        │   └── models/     # Domain model tests
        └── ...             # Other test modules
```
