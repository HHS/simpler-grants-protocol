"""Tests for ApplicantType and ApplicantTypeOptions."""

import pytest
from pydantic import ValidationError

from common_grants_sdk.schemas.pydantic.models.opp_applicant_type import (
    ApplicantType,
    ApplicantTypeOptions,
)


def test_applicant_type_options_enum_values():
    assert ApplicantTypeOptions.government_state == "government_state"
    assert ApplicantTypeOptions.individual == "individual"
    assert ApplicantTypeOptions.custom == "custom"
    assert ApplicantTypeOptions.unrestricted == "unrestricted"
    assert len(ApplicantTypeOptions) == 17


def test_applicant_type_minimal():
    at = ApplicantType.model_validate({"value": "government_state"})
    assert at.value == ApplicantTypeOptions.government_state
    assert at.custom_value is None
    assert at.description is None


def test_applicant_type_with_custom_value():
    at = ApplicantType.model_validate(
        {"value": "custom", "customValue": "My Org", "description": "A custom type"}
    )
    assert at.value == ApplicantTypeOptions.custom
    assert at.custom_value == "My Org"
    assert at.description == "A custom type"


def test_applicant_type_rejects_invalid_value():
    with pytest.raises(ValidationError):
        ApplicantType.model_validate({"value": "not_a_valid_type"})


def test_applicant_type_camel_alias_for_custom_value():
    """customValue is the wire alias for custom_value."""
    at = ApplicantType(value=ApplicantTypeOptions.custom, custom_value="test")
    data = at.model_dump(by_alias=True)
    assert "customValue" in data
    assert data["customValue"] == "test"
