"""Tests for OpportunityBase.with_custom_fields()."""

import pytest

from common_grants_sdk.extensions import CustomFieldSpec, SchemaExtensions
from common_grants_sdk.extensions import Plugin
from common_grants_sdk.schemas.pydantic.fields import CustomFieldType
from common_grants_sdk.schemas.pydantic.models.opp_base import OpportunityBase


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


class _Schemas:
    """Minimal schemas container that mirrors the generated _Schemas class."""

    def __init__(self, **models):
        for name, model in models.items():
            setattr(self, name, model)


def _make_plugin(
    field_specs: dict[str, CustomFieldSpec], model_name: str = "Opportunity"
) -> "Plugin[_Schemas]":
    """Build a Plugin whose schemas.Opportunity is produced by with_custom_fields()."""
    extended = OpportunityBase.with_custom_fields(
        custom_fields=field_specs,
        model_name=model_name,
    )
    extensions: SchemaExtensions = {"Opportunity": field_specs}
    return Plugin(extensions=extensions, schemas=_Schemas(Opportunity=extended))


def _make_plugin_without_opportunity() -> "Plugin[_Schemas]":
    """Build a Plugin that has no Opportunity schema (only Application)."""
    extensions: SchemaExtensions = {}
    return Plugin(extensions=extensions, schemas=_Schemas())


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def simple_plugin() -> "Plugin[_Schemas]":
    return _make_plugin(
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
# Plugin schema tests
# ---------------------------------------------------------------------------


def test_plugin_schema_is_subclass_of_opportunity_base(simple_plugin):
    Opportunity = simple_plugin.schemas.Opportunity

    assert Opportunity is not OpportunityBase
    assert issubclass(Opportunity, OpportunityBase)


def test_plugin_without_opportunity_has_no_opportunity_schema():
    plugin = _make_plugin_without_opportunity()

    assert not hasattr(plugin.schemas, "Opportunity")


def test_two_plugins_produce_distinct_schemas(simple_plugin):
    second_plugin = _make_plugin(
        {"award_ceiling": CustomFieldSpec(field_type=CustomFieldType.NUMBER)}
    )

    assert simple_plugin.schemas.Opportunity is not second_plugin.schemas.Opportunity


# ---------------------------------------------------------------------------
# End-to-end validation tests
# ---------------------------------------------------------------------------


def test_plugin_schema_validates_payload_and_exposes_typed_custom_fields(
    simple_plugin, sample_payload
):
    Opportunity = simple_plugin.schemas.Opportunity

    opp = Opportunity.model_validate(sample_payload)

    assert opp.title == "Community Health Grant"
    assert opp.custom_fields is not None
    assert opp.custom_fields.program_area.value == "Health"
    assert opp.custom_fields.eligibility_types.value == ["nonprofit", "tribal"]


def test_plugin_schema_validates_custom_fields(simple_plugin, sample_payload):
    Opportunity = simple_plugin.schemas.Opportunity

    opp = Opportunity.model_validate(sample_payload)

    assert opp.custom_fields.program_area.value == "Health"
    assert opp.custom_fields.eligibility_types.value == ["nonprofit", "tribal"]
