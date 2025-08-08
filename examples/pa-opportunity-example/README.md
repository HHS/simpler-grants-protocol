# Pennsylvania Grants Example API

This API demonstrates how to use the CommonGrants Protocol with Pennsylvania Grants data. The API:

1. Exposes endpoints for getting PA opportunity data in CommonGrants format
2. Transforms grant opportunity data from the Pennsylvania Grants format to the CommonGrants Protocol format
3. Leverages the CommonGrants Python SDK and FastAPI Template for data transformations and service scaffold

## Requirements

- Python 3.11 or higher
- [Poetry](https://python-poetry.org/) for dependency management

## Getting Started

1. Install dependencies:
   ```bash
   make install
   ```

2. Run the API:
   ```bash
   make dev
   ```

3. Access the API:
   - Opportunities endpoint: http://localhost:8000/common-grants/opportunities
   - Individual opportunity endpoint: http://localhost:8000/common-grants/opportunities/{id}
   - Interactive API documentation: http://localhost:8000/docs
   - ReDoc documentation: http://localhost:8000/redoc

## Commands

The Makefile exposes the following commands:

| Command               | Description                                 |
| --------------------- | ------------------------------------------- |
| `make install`        | Installs the python dependencies and API    |
| `make test`           | Runs the unit test suite and test coverage  |
| `make format`         | Runs formatting with black                  |
| `make lint`           | Runs linting with ruff                      |
| `make check-domain`   | Runs domain config validation
| `make check-spec`     | Validates the OpenAPI specification         |
| `make check-types`    | Runs type checking with pyright             |
| `make checks`         | Runs linting, formatting, and type checking |
| `make dev`            | Runs the development server                 |
| `make gen-openapi`    | Generates the OpenAPI specification         |

## Project Structure

```
├── pyproject.toml          # Python project configuration and dependencies
├── poetry.lock             # Locked versions of dependencies
├── Makefile                # Development workflow commands
├── README.md               # Project documentation
├── openapi.yaml            # Generated OpenAPI specification
│
├── src/
│   └── common_grants/              # Main package directory
│       ├── api.py                  # FastAPI application setup and config
│       ├── routes/                 # API route handlers and endpoints
│       │   ├── opportunities.py    # Opportunity-related endpoints
│       │   └── ...                 # Other route modules
│       │
│       ├── schemas/                    # Data models and schema definitions
│       │   ├── filters/                # Query filter models
│       │   │   ├── base.py             # Base filter types and operators
│       │   │   ├── date_filters.py     # Date-specific filters
│       │   │   ├── money_filters.py    # Money-specific filters
│       │   │   └── string_filters.py   # String-specific filters
│       │   ├── models/                 # Core domain models
│       │   │   ├── opp_search.py       # Search request models
│       │   │   ├── opp_search_request.py # Search request handling
│       │   │   └── ...                 # Other models
│       │   ├── pagination.py           # Pagination models and parameters
│       │   ├── response.py             # API response wrappers
│       │   ├── sorting.py              # Sorting models and parameters
│       │   └── __init__.py             # Schema exports (imports from Python SDK)
│       │
│       ├── services/               # Business logic and data operations
│       │   ├── opportunity.py      # Opportunity-related operations
│       │   └── utils.py            # Shared utility functions
│       │
│       └── scripts/                # Utility scripts
│           └── generate_openapi.py # OpenAPI specification generator
│
└── tests/                  # Test suite
    └── common_grants/      # Tests matching package structure
        ├── schemas/        # Schema-related tests
        │   ├── fields/     # Field type tests (tests SDK imports)
        │   ├── filters/    # Filter model tests
        │   └── models/     # Domain model tests
        └── routes/         # Route handler tests
```

## Dependencies

This template depends on the CommonGrants Python SDK (`common-grants-sdk`) for core field types and models:

- **Field Types**: `Money`, `Event`, `CustomField`, `SystemMetadata`, etc.
- **Core Models**: `OpportunityBase`, `OppFunding`, `OppStatus`, `OppTimeline`

The template extends these with FastAPI-specific schemas for:
- API responses and error handling
- Query filters and pagination
- Request/response models
- Search functionality
