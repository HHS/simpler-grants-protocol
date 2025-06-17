# California Grants Example API

This API demonstrates how to use the CommonGrants Protocol with California Grants Portal data. The API:

1. Exposes endpoints for getting CA opportunity data in CommonGrants format
2. Transforms grant opportunity data from the California Grants Portal format to the CommonGrants Protocol format
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

## Endpoints

### GET /common-grants/opportunities

Returns a paginated list of grant opportunities in CommonGrants Protocol format.

Query Parameters:
- `page` (optional): Page number to retrieve (default: 1)
- `pageSize` (optional): Number of items per page (default: 10)

Example response:
```json
{
  "items": [
    {
      "id": "ca-2024-001",
      "title": "California Climate Action Seed Grants",
      "status": {
        "value": "open",
        "description": "Currently accepting applications"
      },
      "funding": {
        "totalAmountAvailable": {
          "amount": "1000000",
          "currency": "USD"
        }
      }
    }
  ],
  "total": 100,
  "page": 1,
  "pageSize": 10
}
```

### GET /common-grants/opportunities/{id}

Returns detailed information about a specific grant opportunity.

Path Parameters:
- `id`: UUID of the opportunity

## Project Structure

```
ca-opportunity-example/
├── Makefile                  # Development commands
├── pyproject.toml            # Project dependencies
├── poetry.lock               # Locked dependencies
├── src/
│   └── ca_common_grants/     # Main package
│       ├── api.py            # FastAPI application
│       ├── data/             # Source data
│       ├── routers/          # API route handlers
│       ├── services/         # Business logic
│       ├── utils/            # Utility functions
│       └── scripts/          # Utility scripts
└── tests/                    # Test suite
```

## Testing

Run tests with:
```bash
make test
```

## License

This project is licensed under the same terms as the CommonGrants Protocol. 
