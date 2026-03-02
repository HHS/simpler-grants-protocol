# common-grants-sdk

## 0.5.0

### Minor Changes

- 2ab4121: Supports registering custom fields at runtime
  - Updates `Client.opportunity` to `Client.opportunities` to match the TypeScript SDK namespace and the API endpoint paths
  - Adds `OpportunityBase.with_custom_fields()` to extend the base schema with typed custom fields
  - Adds `OpportunityBase.get_custom_field_value()` to get and parse a typed value of a custom field from a customFields object
  - Updates `Client.opportunities` methods to allow SDK users to optionally pass a custom schema to parse the response data:
    - `Client.opportunities.get()`
    - `Client.opportunities.list()`
    - `Client.opportunities.search()`

  Here's an example of how to use the new functionality:

  ```python
  from common_grants_sdk.client import Client, Config
  from common_grants_sdk.schemas.pydantic import OpportunityBase, CustomFieldType
  from common_grants_sdk.extensions.specs import CustomFieldSpec

  # Define a custom field spec for the legacyId custom field
  Opportunity = OpportunityBase.with_custom_fields(
      custom_fields={
          "legacyId": CustomFieldSpec(
              name="Legacy ID",
              field_type=CustomFieldType.INTEGER,
              value=int,
              description="An integer ID for the opportunity, needed for compatibility with legacy systems",
          ),
      },
      model_name="Opportunity",
  )

  # Initialize the client
  config = Config(
      base_url="http://localhost:8000",
      api_key="<your-api-key>",
      timeout=5.0,
      page_size=10,
  )
  client = Client(config)


  def main():
      # Get an opportunity with the custom field
      opportunity = client.opportunities.list(schema=Opportunity)

      # Print the legacy ID of each opportunity
      for opp in opportunity.items:
          print(f"{opp.id}: {opp.title}")
          print(f"  Status: {opp.status.value}")
          print(f"  Legacy ID: {opp.custom_fields.legacy_id.value}")


  if __name__ == "__main__":
      main()
  ```

## 0.4.1

### Patch Changes

- 25cdc8e: Updates vulnerable dependencies

## 0.4.0

### Minor Changes

- 984b46c: Introduce client subpackage for making requests to CommonGrants endpoints

## 0.3.2

### Patch Changes

- 4900dd4: Fixed bug in marshmallow model that could cause serialization errors; updated examples and documentation.

## 0.3.1

### Patch Changes

- e8320c4: Add more marshmallow models (experimental)

## 0.3.0

### Minor Changes

- 96704dd: Add marshmallow schemas to match existing pydantic schemas

## 0.2.2

### Patch Changes

- af513e2: Add field validators to base and date filters

## 0.2.1

### Patch Changes

- 537d150: - Added field validators to filter classes to convert string values to enum instances
  - Updated pydantic dependency to enable stricter enum validations

## 0.2.0

### Minor Changes

- 653c227: Migrated schemas from FastAPI template to PySDK:
  - Filters: DateComparisonFilter, DateRangeFilter, DefaultFilter, MoneyComparisonFilter, MoneyRangeFilter, StringArrayFilter, StringComparisonFilter, OppDefaultFilters, OppFilters
  - Operators: ArrayOperators, ComparisonOperators, EquivalenceOperators, RangeOperators, StringOperators
  - Pagination: PaginatedBodyParams
  - Sorting: SortedResultsInfo, OppSortBy, OppSorting

  Implemented schemas to align with Core v0.2.0:
  - Filters: NumberArrayFilter, NumberComparisonFilter, NumberRangeFilter
  - Pagination: PaginatedQueryParams, PaginatedResultsInfo
  - Responses: Error, Filtered, Paginated, Sorted, Success
  - Sorting: SortBodyParams, SortOrder, SortQueryParams

## 0.1.0

### Minor Changes

- eb15708: Update fields and opportunity models to support core v0.1.0
