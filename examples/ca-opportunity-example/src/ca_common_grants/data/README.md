# California Grants Data

This directory contains a snapshot of data from the California Grants Portal and the data.ca.gov API.

## Data Source

Opportunity data is available from the (California Grants Portal)[https://data.ca.gov/dataset/california-grants-portal] in JSON format from these sources:

- (download URL)[https://data.ca.gov/datastore/dump/111c8c88-21f6-453c-ae2c-b4785a0624f5?format=json]
- (API endpoint)[https://data.ca.gov/api/3/action/datastore_search?resource_id=111c8c88-21f6-453c-ae2c-b4785a0624f5]

## Snapshot

A snaphsot of CA Opportunity data downloaded from (data.ca.gov)[https://data.ca.gov/datastore/dump/111c8c88-21f6-453c-ae2c-b4785a0624f5?format=json] on 2025-06-16 is saved in the `data/` directory:

```
$ ls data/
111c8c88-21f6-453c-ae2c-b4785a0624f5.json
```

## Data Format

The source data from is in JSON format with the following structure:

- `fields`: An array of field definitions, where each field has:
  - `id`: The field name
  - `type`: The data type (e.g., "int", "text")

- `records`: An array of opportunity records, where each record contains values corresponding to the fields defined above.
