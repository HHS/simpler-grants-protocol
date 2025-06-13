# California Grants Example API

This API demonstrates how to use the CommonGrants Protocol with California Grants Portal data. The API:

1. Exposes an endpoint for getting CA opportunity data in CommonGrants format
2. Transforms grant opportunity data from the California Grants Portal format to the CommonGrants Protocol format
3. Leverages the CommonGrants Python SDK for data transformations and service scaffold

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
   - Grants endpoint: http://localhost:8000/api/v1/grants
   - Interactive API documentation: http://localhost:8000/docs
   - ReDoc documentation: http://localhost:8000/redoc

## Endpoints

### GET /api/v1/grants

Returns a list of grant opportunities in CommonGrants Protocol format.

Example response:
```json
[
  {
    "id": "ca-2024-001",
    "title": "California Climate Action Seed Grants",
    "status": {
      "value": "open",
      "description": "Currently accepting applications"
    },
    ...
  }
]
```

## Project Structure

```
ca-opportunity-example/
├── Makefile                    # Development commands
├── api.py                      # FastAPI application
├── data/
│   └── ca_grants_sample.json   # Sample grant data
├── poetry.lock                 # Locked dependencies
├── pyproject.toml              # Project dependencies
├── routers/
│   └── grants.py               # API routes
├── scripts/                    # Utility scripts
└── transform/
│   ├── __init__.py             # Package initialization
│   ├── mapping.py              # Mapping utilities
│   ├── transformer.py          # Transformation logic
│   └── test_transformer.py     # Transformer tests

```

## Development

- The sample data in `data/ca_grants_sample.json` can be updated with new grant opportunity data from [California Grants Poral](https://data.ca.gov/dataset/california-grants-portal)
- The mapping specification in `transform/mapping.py` defines how to transform the data
- The transformer in `transform/transformer.py` uses the CommonGrants SDK to perform the transformation

## Testing

Run tests with:
```bash
make test
```

## License

This project is licensed under the same terms as the CommonGrants Protocol. 
