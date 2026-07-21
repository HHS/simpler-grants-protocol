# common-grants-sdk

## 0.8.0

### Minor Changes

- 5a9d09f: Typed custom-filter authoring and consumption for the Python SDK.

  - `OpportunityFilters` is now an open `TypedDict` (PEP 728 `extra_items`): standard filter keys are typed to their value models, a `total=False` subclass gives each registered custom filter its own typed key, and unregistered keys still pass through. One source of truth for both registration and the consumer's `search(filters=...)` call site. Clean value aliases (`StringArray`, `NumberComparison`, `DateComparison`, …) read at the call site.
  - `define_plugin(routes=...)` takes typed route carriers — `PluginRoutes(opportunities=ResourceRoutes(search=OppSearchFilters))` — so a misspelled route/method is a type error, replacing the stringly-typed route dict.
  - `Plugin.get_client(config)` returns a client already scoped with the plugin's routes and schemas: `opportunities.search()` / `.list()` parse responses with the plugin's custom fields by default and return `SearchResult` / `ListResult` that partition successfully parsed `items` from per-row parse `errors`, so one malformed row no longer fails the batch.
  - `opportunities.search()` raises `FilterError` on an invalid value for both standard and custom filters (e.g. `{ "operator": "in", "value": "open" }` since `in` should be paired with an array rather than a scalar value).

### Patch Changes

- 5a9d09f: Ship a PEP 561 `py.typed` marker so downstream type checkers use the SDK's inline type annotations.

  The package is fully type-annotated but shipped no marker, so `mypy` treated every `common_grants_sdk` import as untyped (`import-untyped`, "missing library stubs or py.typed marker") and consumers got no type-checking from the SDK. Adding the marker brings the Python SDK to parity with the TypeScript SDK, which already ships its `.d.ts` types.

## 0.7.0

### Minor Changes

- 324809b: Add a Python proof-of-concept for the plugin transformation framework (issue #799), mirroring the TypeScript PoC. Plugin authors can now compile declarative mapping dicts into typed `(to_common, from_common)` callables, validate `to_common` output against an extended Pydantic schema, and attach those callables to a plugin via `define_plugin(schemas=...)`.

  **New public surface (under `common_grants_sdk.extensions`):**

  - `build_transforms(to_common_mapping, from_common_mapping, handlers?, common_schema?, source_schema?)` — compiles a pair of mapping dicts into `(to_common, from_common)` callables with call-time structural validation. `handlers` is a `dict[str, Handler]` for custom handler registration. Optional `common_schema` / `source_schema` Pydantic model classes turn `ValidationError`s into `TransformError` entries on `TransformResult.errors` instead of raising.
  - `TransformResult[T]` — unconditional `dataclass(result, errors)` return shape.
  - `TransformError` — structured error class carrying `path`, `handler`, `source_value`, `cause`.
  - `PassthroughModel` — permissive Pydantic model (`extra="allow"`) for use as `source_schema` when the source-system shape is not yet modeled.
  - `Handler`, `PluginCapability` — type aliases for handler callables and capability literals.
  - `PluginMeta` — Pydantic model for plugin identity and capability declaration (`name`, `source_system`, `version`, `capabilities`).
  - `schema(...)` factory — overloaded factory returning a discriminated `SchemaWithTransforms` or `SchemaOnly`. Enforces mappings XOR hand-written transforms, requires a source schema when transforms are present, and validates mapping output keys against the resolved model at call time.
  - `define_plugin()` accepts optional `meta: PluginMeta` and `schemas` mapping. All per-object declarations (custom fields, native schema, transforms) are co-located under `schemas[Object]`. Auto-wires `to_common`/`from_common` from declarative `mappings` when no explicit callables are provided; runs `_validate_output_paths()` at `define_plugin()` call time so key-name mismatches are caught early.

  **Three-state null handling for optional fields:**

  - `number_to_string` and `string_to_number` preserve `None` source values as `None` (the publisher's "doesn't apply" assertion) rather than raising or coercing.
  - `switch_on_value` passes `None` through by default; opt in to target-side translation via a `"null"` key in the case map.
  - `get_from_path` already short-circuits on intermediate `None`; terminal `None` is preserved.
  - The walker places handler-returned `None` onto the output dict as a real `None`, distinct from an absent key — so consumers can read the three states (absent / `None` / value) end-to-end through `to_common` and `from_common`.

  **Removed:**

  - `generate.py` and the old codegen-based plugin utilities have been removed. Consumers who relied on `generate_plugin` or similar codegen helpers should migrate to `define_plugin` with the `schema(...)` factory.

  **Deferred to full SDK:**

  - Always-on `common_schema` validation inside `define_plugin()` — opt-in at `build_transforms()` call site for now (pass the fully extended model as `common_schema` to enable Pydantic validation on `to_common` output).

  Runnable example: `cd lib/python-sdk && poetry run python examples/plugins.py` (round-trips a synthetic grants.gov record through `to_common` and `from_common` with custom handlers, extended-schema validation, and three-state null preservation).

## 0.6.2

### Patch Changes

- 600da2f: Record the Python SDK runtime dependency range update for httpx.

## 0.6.1

### Patch Changes

- c3339df: Change default ARRAY field type annotation from `list[str]` to `list[Any]` in plugin code generation. This more accurately reflects that an array field with no explicit `value` type should not assume string elements.

## 0.6.0

### Minor Changes

- 6cbaed6: Adding support for plugin frmaework

## 0.5.1

### Patch Changes

- d854d81: Fix `field_type` alias in `with_custom_fields()`

  The `field_type` alias was incorrectly set to `type` instead of `fieldType`, which caused `cg check spec` to fail when a schema generated by `with_custom_fields()` was used to serialize API responses.

  This also changes the default strict mode to False, which allows the Pydantic models to coerce strings to enums, datetimes, etc. instead of raising an error. Strict mode can still be enabled by passing `strict=True` to the `model_validate()` method.

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
