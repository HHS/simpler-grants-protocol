"""Utility functions for the common grants service."""

from datetime import date, datetime, timezone
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
    return OpportunityBase(
        id=uuid5(NAMESPACE, title),
        title=title,
        status=OppStatus(
            value=status,
            description=f"Status for {title}",
        ),
        description=f"Description for {title}",
        funding=OppFunding(
            total_amount_available=(
                Money(amount=str(total_available), currency="USD")
                if total_available
                else None
            ),
            min_award_amount=(
                Money(amount=str(min_award_amount), currency="USD")
                if min_award_amount
                else None
            ),
            max_award_amount=(
                Money(amount=str(max_award_amount), currency="USD")
                if max_award_amount
                else None
            ),
            min_award_count=min_award_count,
            max_award_count=max_award_count,
        ),
        key_dates=OppTimeline(
            app_opens=(
                Event(
                    name="Application Opens",
                    date=app_opens,
                    description="Start accepting applications",
                )
                if app_opens
                else None
            ),
            app_deadline=(
                Event(
                    name="Application Deadline",
                    date=app_deadline,
                    description="Final deadline for submissions",
                )
                if app_deadline
                else None
            ),
        ),
        created_at=datetime.now(timezone.utc),
        last_modified_at=datetime.now(timezone.utc),
    )
