# Schemas

The `common_grants_sdk.schemas.pydantic` module provides [Pydantic v2](https://docs.pydantic.dev/) models for validating and parsing CommonGrants data. Use these models to validate API responses, construct grant opportunities, and convert data to/from external formats.

## Table of contents <!-- omit in toc -->

- [Quick start](#quick-start)
- [Usage](#usage)
  - [Validation](#validation)
  - [Type safety](#type-safety)
  - [Generic response schemas](#generic-response-schemas)
- [Opportunity identifiers and funders](#opportunity-identifiers-and-funders)
- [Opportunity details and related awards](#opportunity-details-and-related-awards)
- [Awards](#awards)
  - [Typed recipient custom fields](#typed-recipient-custom-fields)
  - [Award routes, filters and sorting](#award-routes-filters-and-sorting)
  - [Serializing to the wire](#serializing-to-the-wire)
  - [Validation rules shared with awards](#validation-rules-shared-with-awards)
- [API reference](#api-reference)
  - [Base model](#base-model)
  - [Field types](#field-types)
  - [Models](#models)
  - [Response schemas](#response-schemas)

## Quick start

```python
from common_grants_sdk.schemas.pydantic import OpportunityBase

opp = OpportunityBase.model_validate({
    "id": "ac201443-5480-4e36-9799-a39765225153",
    "title": "Research Grant 2024",
    "description": "Funding for innovative research projects",
    "status": {"value": "open"},
    "createdAt": "2024-01-01T00:00:00Z",
    "lastModifiedAt": "2024-01-01T00:00:00Z",
})

print(opp.title)         # "Research Grant 2024"
print(opp.status.value)  # "open"
```

## Usage

### Validation

#### Strict validation with `model_validate()` <!-- omit in toc -->

`model_validate()` returns a fully typed model instance on success or raises a `ValidationError` on failure:

```python
from common_grants_sdk.schemas.pydantic import OpportunityBase

opp = OpportunityBase.model_validate({
    "id": "ac201443-5480-4e36-9799-a39765225153",
    "title": "Research Grant",
    "description": "Funding for research projects",
    "status": {"value": "open"},
    "createdAt": "2024-01-01T00:00:00Z",
    "lastModifiedAt": "2024-01-01T00:00:00Z",
})
print(opp.title)
print(opp.status.value)
```

Which prints:

```
Research Grant
open
```

#### Graceful error handling <!-- omit in toc -->

Catch `ValidationError` to handle invalid data without letting exceptions propagate:

```python
from pydantic import ValidationError
from common_grants_sdk.schemas.pydantic import OpportunityBase

try:
    opp = OpportunityBase.model_validate({
        "id": "not-a-uuid",
        "title": "Research Grant",
        "description": "Funding for research projects",
        "status": {"value": "invalid-status"},
        "createdAt": "2024-01-01T00:00:00Z",
        "lastModifiedAt": "2024-01-01T00:00:00Z",
    })
except ValidationError as e:
    print(e)
```

Which prints:

```
id
  Value error, value is not a valid UUID [type=value_error, ...]
status.value
  Input should be 'forecasted', 'open', 'custom' or 'closed' [type=enum, ...]
```

#### Parsing from JSON or a dict <!-- omit in toc -->

Use `from_json()` and `from_dict()` as convenience alternatives to `model_validate()`:

```python
from common_grants_sdk.schemas.pydantic import OpportunityBase

# From a JSON string
opp = OpportunityBase.from_json('{"id": "ac201443-...", "title": "Grant", ...}')

# From a dict
opp = OpportunityBase.from_dict(data_dict)
```

### Type safety

Use `OppStatusOptions` enum constants for type-safe comparisons instead of magic strings:

```python
from common_grants_sdk.schemas.pydantic import OpportunityBase, OppStatusOptions

def describe_status(opp: OpportunityBase) -> str:
    if opp.status.value == OppStatusOptions.OPEN:
        return "Currently accepting applications"
    elif opp.status.value == OppStatusOptions.CLOSED:
        return "No longer accepting applications"
    elif opp.status.value == OppStatusOptions.FORECASTED:
        return "Coming soon"
    else:
        return "Custom status"
```

Which prints:

```
Currently accepting applications
```

### Generic response schemas

The SDK provides generic (parameterized) response schemas for validating common API response shapes. Pass any item type to create a typed response validator:

```python
from common_grants_sdk.schemas.pydantic import Paginated, OpportunityBase

response = Paginated[OpportunityBase].model_validate({
    "status": 200,
    "message": "Success",
    "items": [
        {
            "id": "ac201443-5480-4e36-9799-a39765225153",
            "title": "Test Opportunity",
            "description": "A test grant opportunity",
            "status": {"value": "open"},
            "createdAt": "2025-01-01T00:00:00Z",
            "lastModifiedAt": "2025-01-01T00:00:00Z",
        }
    ],
    "paginationInfo": {
        "page": 1,
        "pageSize": 20,
        "totalItems": 100,
        "totalPages": 5,
    },
})

print(f"Page {response.pagination_info.page} of {response.pagination_info.total_pages}")
print(f"Found {len(response.items)} opportunities")
```

Which prints:

```
Page 1 of 5
Found 1 opportunities
```

Other generic response schemas include `Sorted[T]` and `Filtered[T, F]`. See the [API reference](#response-schemas) for the full list.

## Opportunity identifiers and funders

`OpportunityBase` carries Core v0.5's optional `identifiers` and `funders`, built from the same shared models awards use:

- `identifiers` is an `OppIds` collection: `opp_us_fon` (`OppIdFon`), `opp_us_aln` (`OppIdAln`), `system_id` and an `other_ids` map.
- `funders` is an `OrgRefCollection`: a required `primary` `OrgRef` plus an optional `other_orgs` map of `OrgRef`s keyed by an implementation-defined role (`coFunder` below). It is not a list.

```python
from datetime import UTC, datetime
from uuid import UUID

from common_grants_sdk.schemas import (
    OppIdAln, OppIdFon, OppIds, OppStatus, OppStatusOptions,
    OpportunityBase, OrgRef, OrgRefCollection,
)

opp = OpportunityBase(
    id=UUID("01912a8b-7c3d-7894-abcd-ef1234567890"),
    title="Research grants",
    description="Support research.",
    status=OppStatus(value=OppStatusOptions.OPEN),
    created_at=datetime(2026, 3, 1, tzinfo=UTC),
    last_modified_at=datetime(2026, 3, 1, tzinfo=UTC),
    identifiers=OppIds(
        opp_us_fon=OppIdFon(id="HHS-2026-001"),
        opp_us_aln=OppIdAln(id="93.575"),
    ),
    funders=OrgRefCollection(
        primary=OrgRef(id=UUID("01912a8b-7c3d-7894-abcd-ef1234567891"), name="Primary agency"),
        other_orgs={
            "coFunder": OrgRef(id=UUID("01912a8b-7c3d-7894-abcd-ef1234567892"), name="Partner agency"),
        },
    ),
)

opp.model_dump(mode="json", by_alias=True, exclude_unset=True)
# {..., "identifiers": {"opp:us:fon": {"id": "HHS-2026-001"}, "opp:us:aln": {"id": "93.575"}},
#  "funders": {"primary": {...}, "otherOrgs": {"coFunder": {...}}}}
```

Python attributes are snake_case (`opp_us_fon`, `other_orgs`, `all_ids`); the wire keeps the exact registry codes and camelCase (`opp:us:fon`, `otherOrgs`, `allIds`). Role keys under `otherOrgs` are passed through as-is.

Both fields may be omitted, and Core never sends them as `null`: an absent field reads as `None` and stays out of the wire dump, and an explicit `null` (JSON, snake_case key or constructor keyword) reads the same way, as omitted. The type is `Optional[...]`, so narrow before use. Invalid nested values (wrong registry code, malformed UUID, missing `primary`, unknown properties on the closed reference and identifier models) are rejected by the shared models.

Serialize with the explicit wire recipe in [Serializing to the wire](#serializing-to-the-wire); there is no default dump helper for it, and `dump()` is not a wire serializer. Of `OpportunityBase`'s own optional fields, only these two read `null` as omitted: the older ones (`funding`, `key_dates`, `source`, `custom_fields`, `accepted_applicant_types`) keep a `null` as a value, which the wire recipe writes back ([#1192](https://github.com/HHS/simpler-grants-protocol/issues/1192)).

Typed custom fields work as before (`OpportunityBase[OpportunityFields]`, `schema()`, `PluginSchemas`, `with_custom_fields()`), and both fields survive the opportunity get, list and search responses. [`examples/typed_opportunities_v05.py`](../../examples/typed_opportunities_v05.py) shows the plugin parse path, checked by pyright.

## Opportunity details and related awards

`OpportunityDetails[CF]` is `OpportunityBase[CF]` plus the detail-only `awards`: the awards that resulted from the opportunity, as `AwdRef` references (`id`, `title`, optional `identifiers`). It takes the same custom-fields parameter, so bare `OpportunityDetails` keeps the untyped `dict[str, CustomField]` map and `OpportunityDetails[OpportunityFields]` keeps typed access. `client.opportunities.get` parses into it by default, while list and search items stay `OpportunityBase` (see the [client README](../client/README.md#get-a-single-opportunity)). `OpportunityResponse.data` is `OpportunityDetails`; the list and search responses keep `OpportunityBase` items.

```python
from common_grants_sdk.schemas import OpportunityDetails

detail = OpportunityDetails.model_validate({
    "id": "4c5d6e7f-8091-42a3-9d4e-5f6a7b8c9d0e",
    "title": "Clean Energy Innovation",
    "description": "Supporting research and deployment of clean energy technologies.",
    "status": {"value": "open"},
    "createdAt": "2025-03-01T00:00:00Z",
    "lastModifiedAt": "2025-03-12T00:00:00Z",
    "awards": [
        {
            "id": "aa1b2c3d-4e5f-4061-8a7b-8c9d0e1f2032",
            "title": "Clean Energy Innovation Demonstration Award",
            "identifiers": {"awd:us:fain": {"id": "DE0000101"}},
        }
    ],
})

for award_ref in detail.awards or []:
    print(award_ref.id, award_ref.title)
```

- **Omitted, empty and `null`.** An absent `awards` means the publisher does not publish the link for this record: it reads as `None` and stays out of the wire dump. `[]` means the link is published and no awards are known. An explicit `null` raises `optional property must be omitted, not null`, and a malformed entry raises the usual `AwdRef` validation error. Entries carry no ordering guarantee.
- **A reference, not the record.** Where an implementation serves the award routes, `GET /awards/{awdId}` returns the canonical award; otherwise the reference's `identifiers`, when supplied, are the key for joining it to another system. Don't assume a reference can be fetched through the same API.
- **Scope.** Only `awards` rejects `null`; inherited fields follow the [base rules](#opportunity-identifiers-and-funders). Core's detail `competitions` is not modeled yet and is ignored like any other unknown property.
- **From an opportunity model.** A valid base record is a valid detail record, so `OpportunityDetails` (any parametrization) validates an `OpportunityBase` or other opportunity instance through the wire recipe: unset properties stay omitted, and anything the instance supplies, `awards` included, is still validated. A server can therefore keep building the get envelope from the model it has, `OpportunityResponse(status=200, message="Success", data=opportunity)`; `data` is always `OpportunityDetails`.
- **Wire conversion.** Serialize with the wire recipe, `model_dump(mode="json", by_alias=True, exclude_unset=True)`, so an omitted `awards` stays omitted and an empty one stays empty. Don't use `exclude_none`, which also drops valid `null` custom-field values. Converting a detail into a *base* model has the same limitation as any opportunity: an unset `identifiers` or `funders` reads as `None` and fails, so validate the wire dump rather than the instance. `TypedOpportunity.model_validate(wire_dump)` gives back the base model without `awards`, because base models ignore unknown properties. Mapping-built `from_common` transforms read a dict, so pass them the wire dump too.

[`examples/typed_opportunity_details.py`](../../examples/typed_opportunity_details.py) runs the client path end to end against a mock transport, checked by pyright.

## Awards

The award models cover everything Core v0.5 `AwardBase` reaches, plus the award route request, response, filter and sorting models. Everything is importable from `common_grants_sdk.schemas` (or `common_grants_sdk.schemas.pydantic` and its category modules):

```python
from common_grants_sdk.schemas import AwardBase

award = AwardBase.model_validate({
    "id": "01912a8b-7c3d-7894-abcd-ef1234567890",
    "title": "Community Health Center Capital Improvement Grant",
    "description": "Supports facility upgrades at federally qualified health centers.",
    "status": {"value": "awarded"},
    "funding": {"awardedAmount": {"amount": "450000.00", "currency": "USD"}},
    "recipientOrganizations": {
        "primary": {
            "id": "018f2e77-6d7e-7f4a-9b5c-def123456789",
            "name": "Riverside Community Health Center",
            "identifiers": {"org:us:ein": {"id": "582345679"}},
        }
    },
    "createdAt": "2026-03-01T00:00:00Z",
    "lastModifiedAt": "2026-06-01T00:00:00Z",
})

print(award.funding.awarded_amount.amount)  # 450000.00
print(award.recipient_organizations.primary.identifiers.org_us_ein.id)  # 582345679
```

The graph, by model:

| Model | Contents |
|---|---|
| `AwardBase` | `id`, `title`, `description`, `status`, `created_at`, `last_modified_at` (required); `identifiers`, `funding`, `key_dates`, `opportunity`, `application`, `funders`, `recipient_organizations`, `recipient_individual`, `parent`, `source` |
| `AwdStatus` / `AwdStatusOptions` | `awarded`, `completed`, `cancelled`, `custom` (with `custom_value`) |
| `AwdFunding` | `requested_amount`, `awarded_amount`, `disbursed_amount` (`Money`) and `details` |
| `AwdTimeline` | `award_date`, `period_of_performance` and an `other_dates` map of `Event`s |
| `AwdRecipientIndividual` | `name` (`Name`), `identifiers` (`IdentifierCollection`) and `custom_fields` |
| `AwdIds` / `AwdIdFain` / `AwdRef` | Award identifiers (`awd:us:fain`) and the reference used for `parent` |
| `AppRef`, `OppRef`, `OrgRef`, `OrgRefCollection` | References to other records: the key fields to look them up, not full resource models. `AppRef` has `title`; `OrgRef` has `name`. |

Identifier collections keep their registry codes as exact wire keys (`org:us:ein`, `org:us:uei`, `org:xi:duns`, `opp:us:fon`, `opp:us:aln`, `awd:us:fain`). In Python they are snake_case attributes (`org_us_ein`); other registries go under `other_ids`, keyed by code.

### Typed recipient custom fields

An award's custom fields live on its individual recipient (`award.recipient_individual.custom_fields`), not on the award; there is no `AwardBase.custom_fields`. By default they are the protocol's untyped `dict[str, CustomField]`. To type them, declare a `CustomFieldSet` and nest it in both generics:

```python
from typing import Optional

from common_grants_sdk.extensions import CustomField, CustomFieldSet
from common_grants_sdk.schemas import AwardBase, AwdRecipientIndividual


class RecipientFields(CustomFieldSet):
    scholarship_year: Optional[CustomField[int]] = None


TypedAward = AwardBase[AwdRecipientIndividual[RecipientFields]]

award = TypedAward.model_validate({
    "id": "01912a8b-7c3d-7894-abcd-ef1234567890",
    "title": "Graduate Research Fellowship",
    "description": "Supports a graduate student's research.",
    "status": {"value": "awarded"},
    "recipientIndividual": {
        "name": {"firstName": "Ada", "lastName": "Lovelace"},
        "customFields": {
            "scholarshipYear": {"name": "scholarshipYear", "fieldType": "integer", "value": 2026},
            "mentor_note": {"name": "mentor_note", "fieldType": "string", "value": None},
        },
    },
    "createdAt": "2026-03-01T00:00:00Z",
    "lastModifiedAt": "2026-03-01T00:00:00Z",
})

fields = award.recipient_individual.custom_fields
print(fields.scholarship_year.value + 1)    # 2027 -- typed as int
print(fields.model_extra["mentor_note"].value)  # None -- undeclared, kept under its exact key
```

Undeclared entries are kept in `model_extra` under their exact wire key and validated as a base `CustomField`. A declared value of the wrong type (`"value": "2026-27"` above) raises a `ValidationError`.

The award response models take the award model the same way and keep it through parsing. Bare models default all the way down: `AwardResponse` holds an `AwardBase`, whose recipient is an `AwdRecipientIndividual` with `dict[str, CustomField]` custom fields.

```python
from common_grants_sdk.schemas import AwardResponse, AwardsListResponse

one = AwardResponse[TypedAward].model_validate(response_json)      # one.data: TypedAward
page = AwardsListResponse[TypedAward].model_validate(list_json)    # page.items: list[TypedAward]
bare = AwardResponse.model_validate(response_json)                 # bare.data: AwardBase
```

[`examples/typed_awards.py`](../../examples/typed_awards.py) shows the full set, checked by pyright.

### Award routes, filters and sorting

| Route | Request | Response |
|---|---|---|
| `GET /awards` | `AwardsListRequest` (query: `page` default 1, `page_size` default 100) | `AwardsListResponse[T]` |
| `GET /awards/{awdId}` | `AwardGetRequest` (path: `awd_id`) | `AwardResponse[T]`, or the shared `Error` when not found |
| `POST /awards/search` | `AwdSearchRequest` (`search`, `filters`, `sorting`, `pagination`, all optional) | `AwardsFilteredResponse[T]` |

`AwardsSortedResponse[T]` is the list response plus `sort_info`. The award responses follow Core exactly: `status` must be `200`, `message` is required, and `pagination_info` requires `page` and `page_size`.

- `AwdFilters`: `status`, `opportunity_id` (string-array filters), `award_date_range` (both bounds required; each a date or a datetime with an offset, which is kept) and `awarded_amount_range` (both `Money` bounds required). Other filters go in `custom_filters`, a map of `DefaultFilter`s whose `value` may be anything, including `null`.
- `AwdDefaultFilters`: the same standard filters, with extra `DefaultFilter`s allowed at the root.
- `AwdSorting`: `sort_by` (`AwdSortBy`: `lastModifiedAt`, `createdAt`, `title`, `status.value`, `keyDates.awardDate`, `funding.awardedAmount`, `custom`), optional `sort_order` (`asc`/`desc`) and `custom_sort_by`.

```python
from common_grants_sdk.schemas import AwardsListRequest, AwdSearchRequest, AwdSortBy, AwdSorting

request = AwdSearchRequest.model_validate({
    "search": "community health",
    "filters": {
        "status": {"operator": "in", "value": ["awarded"]},
        "awardDateRange": {"operator": "between", "value": {"min": "2026-01-01", "max": "2026-12-31"}},
    },
})
request = AwdSearchRequest(
    sorting=AwdSorting(sort_by=AwdSortBy.AWARD_DATE),
    pagination=AwardsListRequest(page=2),
)
```

The award filters are stricter than the opportunity filters of the same names (sealed objects, required range bounds); opportunity search is unchanged.

### Serializing to the wire

Serialize award and opportunity models with:

```python
award.model_dump(mode="json", by_alias=True, exclude_unset=True)
# or award.model_dump_json(by_alias=True, exclude_unset=True)
```

- `by_alias=True` writes the camelCase and registry-code keys (`recipientIndividual`, `org:us:ein`).
- `exclude_unset=True` keeps omitted properties omitted. Without it, every absent optional property is written as `null`, which the protocol rejects. The award models and the new opportunity fields read an explicit `null` as omitted; older opportunity properties, including nested ones such as `funding.details`, keep it as a value (see [Opportunity identifiers and funders](#opportunity-identifiers-and-funders)). Don't use `exclude_none=True` instead: a custom field's `value` is required and may be `null`, and `exclude_none` would drop it.

The base-model convenience methods `dump()` and `dump_json()` use neither flag, so they are not wire serializers.

### Validation rules shared with awards

**Optional is not nullable.** Core optional properties may be omitted but never sent as `null`. These models read an explicit `null`, whether from JSON, a snake_case key or a constructor keyword (`SingleDateEvent(..., description=None)`), as omitted: the property stays unset, so the wire recipe leaves it out. A custom field's `value` is the exception: it is required, and `null` is a valid value (unless you type it, e.g. `CustomField[int]`). A `null` for a declared `CustomFieldSet` entry also reads as omitted.

**Closed objects reject unknown properties.** Where Core seals an object, an unknown property raises a `ValidationError` instead of being dropped. That covers every award model, `Event`, `CustomField`, `Money` and `SystemMetadata`. Maps stay open: custom-field maps, `other_dates`, `other_orgs`, `other_ids`, `custom_filters`, the root of `AwdDefaultFilters` and the generic `IdentifierCollection`. `OpportunityBase` still ignores unknown properties at its root.

These shared models now follow Core more closely. Opportunities and plugins that use them see the same rules:

| Type | Behavior |
|---|---|
| `Event` (`SingleDateEvent`, `DateRangeEvent`, `OtherEvent`) | `eventType` is always serialized, even when it was defaulted; explicit `null` metadata reads as omitted; `name` may be empty |
| `CustomField` | `schema` accepts any absolute URI (`https`, `ftp`, `urn:`, `mailto:`), not just HTTP URLs; `name` may be empty |
| `DecimalString` (`Money.amount`) | Matches Core's `^-?[0-9]+\.?[0-9]*$` with ASCII digits: `"1."` is valid, `".5"` is not. Like any Python regex, `$` also accepts one trailing newline, which the JSON Schema pattern does not. |
| `UTCDateTime` (`created_at`, `last_modified_at`) | Must include a timezone (`Z` or an offset); naive and date-only values are rejected rather than guessed at. Values are normalized to UTC. |
| `ISOTime` (event times) | A plain clock time (`14:30:00`, fractions allowed). Values with an offset are rejected rather than having the offset dropped. |

**Plain times and the emitted schema.** Core defines `isoTime` as a plain time without a timezone, but the emitted JSON Schema declares `format: time`, which strict validators read as RFC 3339 `full-time` and so reject without an offset. Core's own examples fail that check. The SDK follows Core: event times serialize as `14:30:00`. A strictly format-checking JSON Schema validator will reject them until the emitter is fixed.


## API reference

### Base model

| Class | Description |
|---|---|
| `CommonGrantsBaseModel` | Base class for all models. Provides `model_validate`, `from_json`, `from_dict`, `dump`, `dump_json`, `dump_with_mapping`, `validate_with_mapping`. |
| `SystemMetadata` | Tracks `created_at` and `last_modified_at` timestamps for records. |

### Field types

| Type | Description |
|---|---|
| `Money` | Monetary amount with `amount` (decimal string) and `currency` (currency code, convention: ISO 4217) |
| `DecimalString` | String matching Core's decimal pattern, e.g. `"100"`, `"-0.5"`, `"1."` |
| `Event` | Union of `SingleDateEvent`, `DateRangeEvent`, and `OtherEvent` |
| `EventType` | Enum for event type discrimination |
| `SingleDateEvent` | Event with a single `date` |
| `DateRangeEvent` | Event with a `start_date` and `end_date` |
| `OtherEvent` | Event with a custom description or recurrence |
| `CustomField` | Custom field with `name`, `field_type` (`CustomFieldType`), `value` (may be `null`), and optional `schema_url` (any absolute URI) and `description` |
| `CustomFieldType` | Enum for custom field value types: `string`, `integer`, `number`, `boolean`, `array`, `object` |
| `OppStatusOptions` | StrEnum: `OPEN`, `CLOSED`, `FORECASTED`, `CUSTOM` |
| `ISODate` | Alias for `datetime.date` (ISO 8601 date) |
| `ISOTime` | `datetime.time` without a UTC offset (plain clock time) |
| `UTCDateTime` | Timezone-aware `datetime.datetime`, normalized to UTC |
| `EmployerTaxId`, `SamUEI`, `Duns` | Strings matching Core's EIN (9 digits), UEI (12 characters) and DUNS (9 digits) patterns |
| `Name` | A person's name: required `first_name` and `last_name`; optional `prefix`, `middle_name`, `suffix` |
| `Identifier` | An identifier from any registry: optional `registry` (`IdentifierRegistry`: `code`, `url`), `id` and `all_ids` (`IdentifierValue`: `id`, `status`) |
| `IdentifierStatus` | Enum: `active`, `archived` |
| `SystemId` | The hosting system's identifier; `id` is a UUID |
| `OrgIdEin`, `OrgIdUei`, `OrgIdDuns`, `OppIdFon`, `OppIdAln` | Registry-specific identifiers: the registry code is pinned and the values follow its pattern |
| `IdentifierCollection` | `system_id` and an `other_ids` map; open to other properties |
| `OrgIds`, `OppIds` | Organization and opportunity identifier collections, keyed by exact registry code |

### Models

| Class | Description |
|---|---|
| `OpportunityBase[CF]` | Core opportunity model, generic over its custom-fields container; includes `identifiers` (`OppIds`) and `funders` (`OrgRefCollection`) (see [Opportunity identifiers and funders](#opportunity-identifiers-and-funders)) |
| `OpportunityDetails[CF]` | `OpportunityBase[CF]` plus `awards` (`list[AwdRef]`), returned by `client.opportunities.get` (see [Opportunity details and related awards](#opportunity-details-and-related-awards)) |
| `OppFunding` | Funding details: total amount available, min/max award, estimated award count |
| `OppStatus` | Opportunity status with `value`, optional `custom_value` (alias `customValue`, used when `value` is `CUSTOM`), and optional `description` |
| `OppTimeline` | Key dates: `app_opens`, `app_deadline`, and other milestones |
| `AwardBase[R]` | Core award model, generic over its individual-recipient model (see [Awards](#awards)) |
| `AwdRecipientIndividual[CF]` | Individual recipient, generic over its custom-fields container |
| `AwdStatus`, `AwdStatusOptions`, `AwdFunding`, `AwdTimeline` | Award status, funding and key dates |
| `AwdIds`, `AwdIdFain`, `AwdRef` | Award identifiers and award reference |
| `AppRef`, `OppRef`, `OrgRef`, `OrgRefCollection` | References to applications, opportunities and organizations |
| `AwdFilters`, `AwdDefaultFilters` | Award search filters |
| `AwdSorting`, `AwdSortBy` | Award search sorting |
| `AwardsListRequest`, `AwardGetRequest`, `AwdSearchRequest` | Award route requests |

### Response schemas

| Class | Description |
|---|---|
| `DefaultResponse` | Base response with `status` (int) and `message` (str) |
| `Success` | Default success response (`status=200`, `message="Success"`) |
| `Paginated[T]` | Paginated list with `items` and `pagination_info` |
| `Sorted[T]` | Paginated list with additional `sort_info` |
| `Filtered[T, F]` | Sorted list with additional `filter_info` |
| `FilterInfo[T]` | Filter metadata: `filters` and optional `errors` list |
| `OpportunityResponse` | Typed success response wrapping a single `OpportunityDetails` |
| `OpportunitiesListResponse` | Typed `Paginated` response for opportunity listings |
| `OpportunitiesSearchResponse` | Typed `Filtered` response for opportunity search results |
| `AwardResponse[T]` | `GET /awards/{awdId}` success response; `T` defaults to `AwardBase` |
| `AwardsListResponse[T]`, `AwardsSortedResponse[T]`, `AwardsFilteredResponse[T]` | Award list, sorted and search responses; `T` defaults to `AwardBase` |
| `Error` | Error response schema |
