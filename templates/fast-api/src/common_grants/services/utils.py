"""Utility functions for the CommonGrants API."""

from datetime import date, datetime, timezone
from uuid import UUID, uuid5

from common_grants_sdk.schemas.fields import EventType, Money, SingleDateEvent

from common_grants.schemas.models import (
    OpportunityBase,
    OppStatusOptions,
)
from common_grants.schemas.pagination import PaginatedItems, PaginationInfo

NAMESPACE = UUID("58315de5-1411-4c17-a394-561f1a47376f")  # DO NOT CHANGE


def paginate(items: list, page: int, page_size: int) -> PaginatedItems[OpportunityBase]:
    """Paginate a list of items."""
    start = (page - 1) * page_size
    end = start + page_size
    return PaginatedItems(
        items=items[start:end],
        pagination_info=PaginationInfo(
            page=page,
            pageSize=page_size,
            totalItems=len(items),
            totalPages=(len(items) + page_size - 1) // page_size,
        ),
    )


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
        "id": uuid5(NAMESPACE, title),
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
