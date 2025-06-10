"""Tests for the OppStatus model."""

from common_grants_sdk.schemas.models import OppStatus, OppStatusOptions


def test_opp_status_model():
    """Test the OppStatus model."""
    # Test standard status
    status_data = {
        "value": OppStatusOptions.OPEN,
        "customValue": None,
        "description": "Opportunity is currently accepting applications",
    }
    status = OppStatus.model_validate(status_data, strict=False)
    assert status.value == OppStatusOptions.OPEN
    assert status.custom_value is None
    assert status.description == "Opportunity is currently accepting applications"

    # Test custom status
    status_data = {
        "value": OppStatusOptions.CUSTOM,
        "customValue": "Under Review",
        "description": "Applications are being reviewed",
    }
    status = OppStatus.model_validate(status_data, strict=False)
    assert status.value == OppStatusOptions.CUSTOM
    assert status.custom_value == "Under Review"
    assert status.description == "Applications are being reviewed"
