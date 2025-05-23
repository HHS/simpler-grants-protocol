import pytest

from common_grants_sdk.utils.transformation import (
    DEFAULT_HANDLERS,
    transform_from_mapping,
)


@pytest.fixture(name="input_data")
def input_data_fixture():
    """Fixture providing sample input data for transformation tests."""
    return {
        "agency_name": "Department of Examples",
        "opportunity_id": 12345,
        "opportunity_number": "ABC-123-XYZ-001",
        "opportunity_status": "posted",
        "opportunity_title": "Research into ABC",
        "summary": {
            "applicant_types": ["state_governments", "nonprofit"],
            "archive_date": "2025-05-01",
            "award_ceiling": 100000,
            "award_floor": 10000,
            "forecasted_award_date": "2025-09-01",
            "forecasted_close_date": "2025-07-15",
            "forecasted_post_date": "2025-05-01",
        },
    }


def test_field_and_const(input_data):
    """
    Test basic field extraction and constant value transformation.

    Verifies that:
    - Field values can be extracted from the input data
    - Constant values can be set in the output
    - Both can be used in the same transformation
    """
    mapping = {
        "title": {"field": "opportunity_title"},
        "agency": "Example Agency",
    }
    result = transform_from_mapping(input_data, mapping)
    assert result == {
        "title": "Research into ABC",
        "agency": "Example Agency",
    }


def test_match_handler(input_data):
    """
    Test the match transformation handler.

    Verifies that:
    - Values can be transformed based on matching conditions
    - Default values are used when no match is found
    - The match handler correctly maps input values to output values
    """
    mapping = {
        "status": {
            "switch": {
                "field": "opportunity_status",
                "case": {
                    "forecasted": "forecasted",
                    "posted": "open",
                    "archived": "closed",
                },
                "default": "custom",
            }
        }
    }
    result = transform_from_mapping(input_data, mapping)
    assert result == {"status": "open"}


def test_nested_object(input_data):
    """
    Test transformation of nested object structures.

    Verifies that:
    - Nested objects can be created in the output
    - Field values can be extracted from nested input paths
    - Constants can be used within nested structures
    """
    mapping = {
        "funding": {
            "minAwardAmount": {
                "amount": {"field": "summary.award_floor"},
                "currency": "USD",
            }
        }
    }
    result = transform_from_mapping(input_data, mapping)
    assert result == {
        "funding": {"minAwardAmount": {"amount": 10000, "currency": "USD"}}
    }


def test_missing_field_returns_none(input_data):
    """
    Test behavior when accessing non-existent fields.

    Verifies that:
    - Attempting to access a non-existent field returns None
    - The transformation continues to work even with missing fields
    """
    mapping = {"foo": {"field": "nonexistent"}}
    result = transform_from_mapping(input_data, mapping)
    assert result == {"foo": None}


def test_literal_value(input_data):
    """
    Test handling of literal values in the mapping.

    Verifies that:
    - Literal values are passed through unchanged
    - Non-dictionary values are treated as literals
    """
    mapping = {"static": 42}
    result = transform_from_mapping(input_data, mapping)
    assert result == {"static": 42}


def test_nested_and_match(input_data):
    """
    Test combination of nested objects and match transformations.

    Verifies that:
    - Match transformations can be used within nested structures
    - Constants can be used alongside matches in nested objects
    - Complex nested transformations work correctly
    """
    mapping = {
        "status": {
            "value": {
                "switch": {
                    "field": "opportunity_status",
                    "case": {
                        "forecasted": "forecasted",
                        "posted": "open",
                        "archived": "closed",
                    },
                    "default": "custom",
                }
            },
            "description": "The opportunity is currently accepting applications",
        }
    }
    result = transform_from_mapping(input_data, mapping)
    assert result == {
        "status": {
            "value": "open",
            "description": "The opportunity is currently accepting applications",
        }
    }


def test_list_field(input_data):
    """
    Test extraction of list fields from the input data.

    Verifies that:
    - List values can be extracted from the input data
    - Lists are preserved in their original form
    """
    mapping = {"applicant_types": {"field": "summary.applicant_types"}}
    result = transform_from_mapping(input_data, mapping)
    assert result == {"applicant_types": ["state_governments", "nonprofit"]}


def test_extend_with_concat(input_data):
    """
    Test custom handler for concatenating values.

    Verifies that:
    - Custom handlers can be added to the transformation system
    - The concat handler can combine multiple transformed values
    - The handler works with both field values and constants
    """

    # Patch in a concat handler for this test
    def handle_concat(data, concat_spec):
        return "".join(
            str(transform_from_mapping(data, part)) for part in concat_spec["parts"]
        )

    DEFAULT_HANDLERS["concat"] = handle_concat

    mapping = {
        "opportunity_code": {
            "concat": {
                "parts": [
                    {"field": "opportunity_number"},
                    "-",
                    {"field": "opportunity_id"},
                ]
            }
        }
    }
    result = transform_from_mapping(input_data, mapping)
    assert result == {"opportunity_code": "ABC-123-XYZ-001-12345"}


def test_extend_with_type_conversion(input_data):
    """
    Test custom handler for type conversion.

    Verifies that:
    - Custom handlers can perform type conversions
    - The type handler can convert values to different types
    - Custom handlers can be passed explicitly to transform_from_mapping
    """

    def handle_type(data, type_spec):
        value = transform_from_mapping(data, type_spec["value"])
        typ = type_spec["to"]
        if typ == "string":
            return str(value)
        elif typ == "number":
            return float(value)  # type: ignore
        return value

    handlers = {
        **DEFAULT_HANDLERS,
        "type": handle_type,
    }

    mapping = {
        "id_str": {"type": {"value": {"field": "opportunity_id"}, "to": "string"}}
    }
    result = transform_from_mapping(input_data, mapping, handlers=handlers)
    assert result == {"id_str": "12345"}


def test_deeply_nested(input_data):
    """
    Test transformation with deeply nested structures.

    Verifies that:
    - The transformation system can handle deeply nested objects
    - Field paths can access deeply nested values
    - The structure of deeply nested objects is preserved
    """
    mapping = {
        "level1": {"level2": {"val": {"field": "summary.forecasted_award_date"}}}
    }
    result = transform_from_mapping(input_data, mapping)
    assert result == {"level1": {"level2": {"val": "2025-09-01"}}}
