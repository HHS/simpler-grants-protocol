"""Tests for OpportunityBase.register_plugin() and registered_schema()."""

import pytest

from common_grants_sdk.extensions import CustomFieldSpec, SchemaExtensions
from common_grants_sdk.plugin import Plugin
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
) -> Plugin:
    """Build a Plugin whose schemas.Opportunity is produced by with_custom_fields()."""
    extended = OpportunityBase.with_custom_fields(
        custom_fields=field_specs,
        model_name=model_name,
    )
    extensions: SchemaExtensions = {"Opportunity": field_specs}
    return Plugin(extensions=extensions, schemas=_Schemas(Opportunity=extended))


def _make_plugin_without_opportunity() -> Plugin:
    """Build a Plugin that has no Opportunity schema (only Application)."""
    extensions: SchemaExtensions = {}
    return Plugin(extensions=extensions, schemas=_Schemas())


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def reset_plugin_registry():
    """Reset OpportunityBase._plugin after every test to prevent state leakage."""
    yield
    OpportunityBase._plugin = None


@pytest.fixture
def simple_plugin() -> Plugin:
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
# register_plugin() tests
# ---------------------------------------------------------------------------


def test_register_plugin_returns_extended_model(simple_plugin):
    Opportunity = OpportunityBase.register_plugin(simple_plugin)

    assert Opportunity is not OpportunityBase
    assert issubclass(Opportunity, OpportunityBase)


def test_register_plugin_stores_plugin_on_class(simple_plugin):
    assert OpportunityBase._plugin is None

    OpportunityBase.register_plugin(simple_plugin)

    assert OpportunityBase._plugin is simple_plugin


def test_register_plugin_raises_when_schema_missing():
    plugin_without_opportunity = _make_plugin_without_opportunity()

    with pytest.raises(ValueError, match="does not define a schema for 'Opportunity'"):
        OpportunityBase.register_plugin(plugin_without_opportunity)


def test_register_plugin_replaces_previously_registered_plugin(simple_plugin):
    second_plugin = _make_plugin(
        {"award_ceiling": CustomFieldSpec(field_type=CustomFieldType.NUMBER)}
    )

    OpportunityBase.register_plugin(simple_plugin)
    OpportunityBase.register_plugin(second_plugin)

    assert OpportunityBase._plugin is second_plugin


# ---------------------------------------------------------------------------
# registered_schema() tests
# ---------------------------------------------------------------------------


def test_registered_schema_returns_base_class_when_no_plugin_registered():
    result = OpportunityBase.registered_schema()

    assert result is OpportunityBase


def test_registered_schema_returns_extended_model_after_registration(simple_plugin):
    OpportunityBase.register_plugin(simple_plugin)

    result = OpportunityBase.registered_schema()

    assert result is not OpportunityBase
    assert issubclass(result, OpportunityBase)


def test_registered_schema_matches_register_plugin_return_value(simple_plugin):
    returned_directly = OpportunityBase.register_plugin(simple_plugin)
    retrieved_later = OpportunityBase.registered_schema()

    assert returned_directly is retrieved_later


# ---------------------------------------------------------------------------
# End-to-end validation tests
# ---------------------------------------------------------------------------


def test_registered_model_validates_payload_and_exposes_typed_custom_fields(
    simple_plugin, sample_payload
):
    Opportunity = OpportunityBase.register_plugin(simple_plugin)

    opp = Opportunity.model_validate(sample_payload)

    assert opp.title == "Community Health Grant"
    assert opp.custom_fields is not None
    assert opp.custom_fields.program_area.value == "Health"
    assert opp.custom_fields.eligibility_types.value == ["nonprofit", "tribal"]


def test_registered_schema_validates_same_payload_as_direct_return(
    simple_plugin, sample_payload
):
    OpportunityBase.register_plugin(simple_plugin)
    ExtendedOpportunity = OpportunityBase.registered_schema()

    opp = ExtendedOpportunity.model_validate(sample_payload)

    assert opp.custom_fields.program_area.value == "Health"
    assert opp.custom_fields.eligibility_types.value == ["nonprofit", "tribal"]


def test_plugin_registry_reset_between_tests():
    """Verify the autouse fixture correctly resets state (no plugin from previous test)."""
    assert OpportunityBase._plugin is None
    result = OpportunityBase.registered_schema()
    assert result is OpportunityBase
