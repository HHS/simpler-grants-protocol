---
"common-grants-sdk": minor
---

Supports registering custom fields at runtime

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
