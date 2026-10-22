"""The award graph is public through the existing schema barrels, and nothing else moved."""

import importlib

import pytest

import common_grants_sdk.schemas as schemas
import common_grants_sdk.schemas.pydantic as pydantic_schemas

# Every public award-graph and route name, by the category barrel that owns it.
AWARD_EXPORTS: dict[str, list[str]] = {
    "fields": [
        "EventBase",
        "Identifier",
        "IdentifierCollection",
        "IdentifierRegistry",
        "IdentifierStatus",
        "IdentifierValue",
        "Name",
        "OppIdAln",
        "OppIdFon",
        "OppIds",
        "OrgIdDuns",
        "OrgIdEin",
        "OrgIdUei",
        "OrgIds",
        "SystemId",
    ],
    "models": [
        "AppRef",
        "AwardBase",
        "AwdFunding",
        "AwdIdFain",
        "AwdIds",
        "AwdRecipientIndividual",
        "AwdRef",
        "AwdStatus",
        "AwdStatusOptions",
        "AwdTimeline",
        "OppRef",
        "OrgRef",
        "OrgRefCollection",
    ],
    "filters": ["AwdDefaultFilters", "AwdFilters"],
    "requests": ["AwardGetRequest", "AwardsListRequest", "AwdSearchRequest"],
    "responses": [
        "AwardResponse",
        "AwardsFilteredResponse",
        "AwardsListResponse",
        "AwardsSortedResponse",
    ],
    "types": ["Duns", "EmployerTaxId", "SamUEI"],
}
# ``sorting`` has no ``__all__``; its public names reach the barrels by wildcard.
SORTING_EXPORTS = ["AwdSortBy", "AwdSorting"]
ADDED = sorted(
    [name for names in AWARD_EXPORTS.values() for name in names] + SORTING_EXPORTS
)

# ``schemas.pydantic.__all__`` before the award models (parent 4b5c1baf). Kept
# verbatim, including names that leak in through wildcard imports, so that any
# removal or unintended addition shows up here.
BASELINE_ALL = [
    "AliasGenerator", "ApplicantType", "ApplicantTypeOptions", "ArrayOperator",
    "BaseModel", "BooleanComparison", "BooleanComparisonFilter", "CAMEL_ALIASES",
    "CAMEL_WIRE_CONFIG", "CommonGrantsBaseModel", "ComparisonOperator", "ConfigDict",
    "CustomField", "CustomFieldType", "DateComparison", "DateComparisonFilter",
    "DateRange", "DateRangeEvent", "DateRangeFilter", "DecimalString", "DefaultFilter",
    "DefaultResponse", "Enum", "EquivalenceOperator", "Error", "Event", "EventType",
    "Field", "FilterInfo", "Filtered", "ISODate", "ISOTime", "InvalidMoneyValueError",
    "Money", "MoneyComparison", "MoneyComparisonFilter", "MoneyRange",
    "MoneyRangeFilter", "NumberArray", "NumberArrayFilter", "NumberComparison",
    "NumberComparisonFilter", "NumberRange", "NumberRangeFilter", "OppDefaultFilters",
    "OppFilters", "OppFunding", "OppSortBy", "OppSorting", "OppStatus",
    "OppStatusOptions", "OppTimeline", "OpportunitiesListResponse",
    "OpportunitiesSearchResponse", "OpportunityBase", "OpportunityFilters",
    "OpportunityResponse", "OpportunitySearchRequest", "Optional", "OtherEvent",
    "Paginated", "PaginatedBase", "PaginatedBodyParams", "PaginatedQueryParams",
    "PaginatedResultsInfo", "RangeOperator", "Self", "SingleDateEvent", "SortBase",
    "SortBodyParams", "SortOrder", "SortQueryParams", "Sorted", "SortedResultsInfo",
    "StrEnum", "StringArray", "StringArrayFilter", "StringComparison",
    "StringComparisonFilter", "StringOperator", "Success", "SystemMetadata",
    "UTCDateTime", "Union", "base", "fields", "filters", "json", "model_validator",
    "models", "pagination", "requests", "responses", "sorting", "to_camel",
    "transform_from_mapping", "types",
]  # fmt: skip


def test_public_surface_only_gains_the_award_names():
    assert sorted(set(pydantic_schemas.__all__) - set(BASELINE_ALL)) == ADDED
    assert set(BASELINE_ALL) <= set(pydantic_schemas.__all__)


@pytest.mark.parametrize(
    ("barrel", "name"),
    [(barrel, name) for barrel, names in AWARD_EXPORTS.items() for name in names]
    + [("sorting", name) for name in SORTING_EXPORTS],
)
def test_award_names_resolve_to_one_object_on_every_public_path(barrel, name):
    module = importlib.import_module(f"common_grants_sdk.schemas.pydantic.{barrel}")

    if barrel != "sorting":
        assert name in module.__all__
    obj = getattr(module, name)
    assert getattr(pydantic_schemas, name) is obj
    assert getattr(schemas, name) is obj


@pytest.mark.parametrize(
    "helper",
    [
        "SealedModel",
        "NonNullOptionals",
        "_IdentifierT",
        "AwareDatetime",
        "StringConstraints",
        "RecipientT",
        "RecipientCF",
        "AwardT",
    ],
)
def test_implementation_helpers_stay_private(helper):
    assert helper not in pydantic_schemas.__all__
    assert not hasattr(schemas, helper)
