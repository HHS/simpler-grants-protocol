"""Tests for the OppFunding model."""

from common_grants_sdk.schemas.fields import Money
from common_grants_sdk.schemas.models import OppFunding


def test_opp_funding_model():
    """Test the OppFunding model."""
    funding = OppFunding(
        total_amount_available=Money(amount="1000000.00", currency="USD"),
        min_award_amount=Money(amount="50000.00", currency="USD"),
        max_award_amount=Money(amount="100000.00", currency="USD"),
        min_award_count=5,
        max_award_count=10,
        estimated_award_count=7,
    )
    assert funding.total_amount_available is not None
    assert funding.total_amount_available.amount == "1000000.00"
    assert funding.min_award_amount is not None
    assert funding.min_award_amount.amount == "50000.00"
    assert funding.max_award_amount is not None
    assert funding.max_award_amount.amount == "100000.00"
    assert funding.min_award_count == 5
    assert funding.max_award_count == 10
    assert funding.estimated_award_count == 7
