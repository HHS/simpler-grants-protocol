"""Tests for OpportunityBase.with_custom_fields() (runtime custom-field registration)."""

import pytest

from common_grants_sdk.extensions import CustomFieldSpec
from common_grants_sdk.schemas.pydantic.fields import CustomFieldType
from common_grants_sdk.schemas.pydantic.models.opp_base import OpportunityBase

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _extended(field_specs: dict[str, CustomFieldSpec], model_name: str = "Opportunity"):
    """Return an OpportunityBase subclass produced by with_custom_fields()."""
    return OpportunityBase.with_custom_fields(
        custom_fields=field_specs,
        model_name=model_name,
    )


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def simple_opportunity():
    return _extended(
        {
            "program_area": CustomFieldSpec(
                field_type=CustomFieldType.STRING,
                description="Grant program area",
            ),
            "eligibility_types": CustomFieldSpec(
                field_type=CustomFieldType.ARRAY,
                description="Eligible organization types",
            ),
        }
    )


@pytest.fixture
def sample_payload() -> dict:
    return {
        "id": "573525f2-8e15-4405-83fb-e6523511d893",
        "title": "Community Health Grant",
        "status": {"value": "open"},
        "description": "Funding for community health projects",
        "createdAt": "2025-01-01T00:00:00Z",
        "lastModifiedAt": "2025-01-01T00:00:00Z",
        "customFields": {
            "program_area": {"fieldType": "string", "value": "Health"},
            "eligibility_types": {
                "fieldType": "array",
                "value": ["nonprofit", "tribal"],
            },
        },
    }


# ---------------------------------------------------------------------------
# Schema construction tests
# ---------------------------------------------------------------------------


def test_with_custom_fields_is_subclass_of_opportunity_base(simple_opportunity):
    assert simple_opportunity is not OpportunityBase
    assert issubclass(simple_opportunity, OpportunityBase)


def test_two_calls_produce_distinct_schemas(simple_opportunity):
    second = _extended(
        {"award_ceiling": CustomFieldSpec(field_type=CustomFieldType.NUMBER)}
    )
    assert simple_opportunity is not second


# ---------------------------------------------------------------------------
# End-to-end validation tests
# ---------------------------------------------------------------------------


def test_validates_payload_and_exposes_typed_custom_fields(
    simple_opportunity, sample_payload
):
    opp = simple_opportunity.model_validate(sample_payload)

    assert opp.title == "Community Health Grant"
    assert opp.custom_fields is not None
    assert opp.custom_fields.program_area.value == "Health"
    assert opp.custom_fields.eligibility_types.value == ["nonprofit", "tribal"]
