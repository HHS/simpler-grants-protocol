# California Grants Data

This directory contains data sourced from the California Grants Portal and the data.ca.gov API.

## Data Source

The data is fetched from the California Grants Portal API endpoint:
```
https://data.ca.gov/api/3/action/datastore_search?resource_id=111c8c88-21f6-453c-ae2c-b4785a0624f5
```

The `resource_id` parameter sent to the API endpoint was identified through the California Grants Portal dataset page:
```
https://data.ca.gov/dataset/california-grants-portal
```

## Data Format

The source data from data.ca.gov is in JSON format with the following structure:

- `fields`: An array of field definitions, where each field has:
  - `id`: The field name
  - `type`: The data type (e.g., "int", "text")

- `records`: An array of opportunity records, where each record contains values corresponding to the fields defined above.

Each record represents a single grant opportunity and its associated metadata. 