"""Utility functions for the common grants service."""

from datetime import date, datetime, timezone, timedelta
from uuid import UUID, uuid5

from common_grants_sdk.schemas.fields import Event, Money

from common_grants.schemas.models import (
    OppFunding,
    OpportunityBase,
    OppStatus,
    OppStatusOptions,
    OppTimeline,
)
from common_grants.schemas.pagination import PaginatedItems, PaginationInfo

NAMESPACE = UUID("58315de5-1411-4c17-a394-561f1a47376f")


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
    status: OppStatusOptions,
    total_available: int | None = None,
    min_award_amount: int | None = None,
    max_award_amount: int | None = None,
    min_award_count: int | None = None,
    max_award_count: int | None = None,
    app_opens: date | None = None,
    app_deadline: date | None = None,
) -> OpportunityBase:
    """Return a mock opportunity."""
    now = datetime.now(timezone.utc)
    default_open = app_opens or date(1970, 1, 1)
    # If deadline is missing, set to one day after open
    deadline = app_deadline or (default_open + timedelta(days=1))
    opp_data = {
        "id": uuid5(NAMESPACE, title),
        "title": title,
        "status": {
            "value": status,
            "description": f"Status for {title}",
        },
        "description": f"Description for {title}",
        "funding": {
            "totalAmountAvailable": (
                Money(amount="0.00", currency="USD")
                if total_available is None
                else Money(amount=str(total_available), currency="USD")
            ),
            "minAwardAmount": (
                Money(amount="0.00", currency="USD")
                if min_award_amount is None
                else Money(amount=str(min_award_amount), currency="USD")
            ),
            "maxAwardAmount": (
                Money(amount="0.00", currency="USD")
                if max_award_amount is None
                else Money(amount=str(max_award_amount), currency="USD")
            ),
            "minAwardCount": min_award_count,
            "maxAwardCount": max_award_count,
        },
        "keyDates": {
            "appOpens": Event(
                name="Application Opens",
                date=default_open,
                description="Start accepting applications",
            ),
            "appDeadline": Event(
                name="Application Deadline",
                date=deadline,
                description="Final deadline for submissions",
            ),
        },
        "createdAt": now,
        "lastModifiedAt": now,
    }
    return OpportunityBase.model_validate(opp_data)
