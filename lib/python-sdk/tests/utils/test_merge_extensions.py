import pytest

from common_grants_sdk.extensions import (
    CustomFieldSpec,
    SchemaExtensions,
    merge_extensions,
)
from common_grants_sdk.schemas.pydantic.fields import CustomFieldType


def test_merge_disjoint_extensions():
    source_one: SchemaExtensions = {
        "Opportunity": {
            "eligibility_type": CustomFieldSpec(
                field_type=CustomFieldType.ARRAY,
                description="Types of eligible organizations",
            )
        }
    }
    source_two: SchemaExtensions = {
        "Application": {
            "priority_score": CustomFieldSpec(
                field_type=CustomFieldType.NUMBER,
                description="Internal ranking score",
            )
        }
    }

    merged = merge_extensions([source_one, source_two])

    assert set(merged.keys()) == {"Opportunity", "Application"}
    assert "eligibility_type" in merged["Opportunity"]
    assert "priority_score" in merged["Application"]


def test_merge_raises_on_duplicate_field_by_default():
    source_one: SchemaExtensions = {
        "Opportunity": {
            "eligibility_type": CustomFieldSpec(field_type=CustomFieldType.ARRAY)
        }
    }
    source_two: SchemaExtensions = {
        "Opportunity": {
            "eligibility_type": CustomFieldSpec(field_type=CustomFieldType.STRING)
        }
    }

    with pytest.raises(
        ValueError,
        match='duplicate field "eligibility_type" on model "Opportunity"',
    ):
        merge_extensions([source_one, source_two])


def test_merge_last_wins_on_duplicate_field():
    source_one: SchemaExtensions = {
        "Opportunity": {
            "eligibility_type": CustomFieldSpec(
                field_type=CustomFieldType.ARRAY,
                description="First",
            )
        }
    }
    source_two: SchemaExtensions = {
        "Opportunity": {
            "eligibility_type": CustomFieldSpec(
                field_type=CustomFieldType.STRING,
                description="Last",
            )
        }
    }

    merged = merge_extensions([source_one, source_two], on_conflict="last_wins")

    assert (
        merged["Opportunity"]["eligibility_type"].field_type == CustomFieldType.STRING
    )
    assert merged["Opportunity"]["eligibility_type"].description == "Last"


def test_merge_first_wins_on_duplicate_field():
    source_one: SchemaExtensions = {
        "Opportunity": {
            "eligibility_type": CustomFieldSpec(
                field_type=CustomFieldType.ARRAY,
                description="First",
            )
        }
    }
    source_two: SchemaExtensions = {
        "Opportunity": {
            "eligibility_type": CustomFieldSpec(
                field_type=CustomFieldType.STRING,
                description="Last",
            )
        }
    }

    merged = merge_extensions([source_one, source_two], on_conflict="first_wins")

    assert merged["Opportunity"]["eligibility_type"].field_type == CustomFieldType.ARRAY
    assert merged["Opportunity"]["eligibility_type"].description == "First"


def test_merge_empty_inputs_returns_empty_mapping():
    assert merge_extensions([]) == {}


def test_merge_single_source_passthrough():
    source: SchemaExtensions = {
        "Opportunity": {
            "eligibility_type": CustomFieldSpec(field_type=CustomFieldType.ARRAY)
        }
    }

    merged = merge_extensions([source])

    assert merged is source


def test_merge_overlapping_model_keys_without_field_conflicts():
    source_one: SchemaExtensions = {
        "Opportunity": {
            "eligibility_type": CustomFieldSpec(field_type=CustomFieldType.ARRAY)
        }
    }
    source_two: SchemaExtensions = {
        "Opportunity": {
            "funding_track": CustomFieldSpec(field_type=CustomFieldType.STRING)
        }
    }

    merged = merge_extensions([source_one, source_two])

    assert set(merged["Opportunity"].keys()) == {"eligibility_type", "funding_track"}
