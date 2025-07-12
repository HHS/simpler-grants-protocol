"""Encapsulates key dates in the opportunity timeline."""

from typing import Optional

from pydantic import Field

from common_grants_sdk.schemas.base import CommonGrantsBaseModel
from common_grants_sdk.schemas.fields import Event


class OppTimeline(CommonGrantsBaseModel):
    """Key dates and events in the lifecycle of an opportunity."""

    post_date: Optional[Event] = Field(
        default=None,
        alias="postDate",
        description="The date (and time) at which the opportunity is posted",
    )
    close_date: Optional[Event] = Field(
        default=None,
        alias="closeDate",
        description="The date (and time) at which the opportunity closes",
    )
    other_dates: Optional[dict[str, Event]] = Field(
        default=None,
        alias="otherDates",
        description="An optional map of other key dates or events in the opportunity timeline",
    )
