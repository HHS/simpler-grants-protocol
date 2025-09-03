"""Utility functions for the CommonGrants API."""

from datetime import date, datetime, timezone
from typing import Any
from uuid import uuid5

from common_grants_sdk.schemas.pydantic.fields import EventType, Money, SingleDateEvent

from common_grants.constants import CA_OPPORTUNITY_NAMESPACE
from common_grants.schemas import (
    OppFilters,
    OpportunityBase,
    OppStatusOptions,
)


def build_applied_filters(filters: OppFilters) -> dict[str, Any]:
    """
    Build a dictionary of only the filters that were actually provided.

    This creates a response that matches the Core v0.1.0 specification
    by only including filters that have values (not None).
    """
    applied_filters = {}

    if filters.status is not None:
        applied_filters["status"] = filters.status.model_dump()
    if filters.close_date_range is not None:
        applied_filters["closeDateRange"] = filters.close_date_range.model_dump()
    if filters.total_funding_available_range is not None:
        applied_filters["totalFundingAvailableRange"] = (
            filters.total_funding_available_range.model_dump()
        )
    if filters.min_award_amount_range is not None:
        applied_filters["minAwardAmountRange"] = (
            filters.min_award_amount_range.model_dump()
        )
    if filters.max_award_amount_range is not None:
        applied_filters["maxAwardAmountRange"] = (
            filters.max_award_amount_range.model_dump()
        )
    if filters.custom_filters is not None:
        applied_filters["customFilters"] = filters.custom_filters

    return applied_filters


def mock_opportunity(  # noqa: PLR0913
    title: str,
    description: str | None = None,
    total_available: float | None = None,
    min_award_amount: float | None = None,
    max_award_amount: float | None = None,
    min_award_count: int | None = None,
    max_award_count: int | None = None,
    app_opens: date | None = None,
    app_deadline: date | None = None,
) -> OpportunityBase:
    """Create a mock opportunity for testing purposes."""
    now = datetime.now(timezone.utc)

    # Create funding object
    funding = {}
    if total_available is not None:
        funding["totalAmountAvailable"] = Money(
            amount=str(total_available),
            currency="USD",
        )
    if min_award_amount is not None:
        funding["minAwardAmount"] = Money(amount=str(min_award_amount), currency="USD")
    if max_award_amount is not None:
        funding["maxAwardAmount"] = Money(amount=str(max_award_amount), currency="USD")
    if min_award_count is not None:
        funding["minAwardCount"] = min_award_count
    if max_award_count is not None:
        funding["maxAwardCount"] = max_award_count

    # Create keyDates object
    key_dates = {}
    if app_opens is not None:
        key_dates["postDate"] = SingleDateEvent(
            name="Application Posted",
            eventType=EventType.SINGLE_DATE,
            date=app_opens,
            description="Applications posted",
        )
    if app_deadline is not None:
        key_dates["closeDate"] = SingleDateEvent(
            name="Application Deadline",
            eventType=EventType.SINGLE_DATE,
            date=app_deadline,
            description="Applications close",
        )

    opp_data = {
        # For mock opportunities, use title as the unique identifier
        # In real data, we would use the PortalID from the CA Grants Portal
        "id": uuid5(CA_OPPORTUNITY_NAMESPACE, title),
        "title": title,
        "status": {
            "value": OppStatusOptions.OPEN,
            "description": f"Status for {title}",
        },
        "description": description or f"Description for {title}",
        "createdAt": now,
        "lastModifiedAt": now,
    }

    # Conditionally add funding and keyDates
    if funding:
        opp_data["funding"] = funding
    if key_dates:
        opp_data["keyDates"] = key_dates

    return OpportunityBase.model_validate(opp_data)
