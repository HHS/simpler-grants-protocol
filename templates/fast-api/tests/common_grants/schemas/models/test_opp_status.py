"""Tests for the OppStatus model."""

from common_grants_sdk.schemas.models import OppStatus, OppStatusOptions


def test_opp_status_model():
    """Test the OppStatus model."""
    # Test standard status
    status = OppStatus(
        value=OppStatusOptions.OPEN,
        custom_value=None,
        description="Opportunity is currently accepting applications",
    )
    assert status.value == OppStatusOptions.OPEN
    assert status.custom_value is None
    assert status.description == "Opportunity is currently accepting applications"

    # Test custom status
    status = OppStatus(
        value=OppStatusOptions.CUSTOM,
        custom_value="Under Review",
        description="Applications are being reviewed",
    )
    assert status.value == OppStatusOptions.CUSTOM
    assert status.custom_value == "Under Review"
    assert status.description == "Applications are being reviewed"
