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
| `make test-coverage`  | Runs tests with coverage report             |
| `make format`         | Runs formatting with black                  |
| `make lint`           | Runs linting with ruff                      |
| `make check-format`   | Checks formatting without making changes    |
| `make check-lint`     | Checks linting without making changes      |
| `make check-domain`   | Runs domain config validation               |
| `make check-spec`     | Validates the OpenAPI specification         |
| `make check-types`    | Runs type checking with pyright             |
| `make checks`         | Runs linting, formatting, and type checking |
| `make dev`            | Runs the development server                 |
| `make gen-openapi`    | Generates the OpenAPI specification         |

## Dependencies

This template depends on the CommonGrants Python SDK (`common-grants-sdk`) for core field types and models:

- **Field Types**: `Money`, `Event`, `CustomField`, `SystemMetadata`, etc.
- **Core Models**: `OpportunityBase`, `OppFunding`, `OppStatus`, `OppTimeline`

The template extends these with FastAPI-specific schemas for:
- API responses and error handling
- Query filters and pagination
- Request/response models
- Search functionality
