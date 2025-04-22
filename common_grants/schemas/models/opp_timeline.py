"""Models for opportunity timelines and events."""

from typing import Optional

from pydantic import Field

from common_grants.schemas.base import CommonGrantsBaseModel
from common_grants.schemas.fields import Event


class OppTimeline(CommonGrantsBaseModel):
    """Key dates and events in the lifecycle of an opportunity."""

    app_opens: Optional[Event] = Field(
        default=None,
        description="The date (and time) at which the opportunity begins accepting applications",
    )
    app_deadline: Optional[Event] = Field(
        default=None,
        description="The final deadline for submitting applications",
    )
    other_dates: Optional[dict[str, Event]] = Field(
        default=None,
        description="An optional map of other key dates in the opportunity timeline",
    ) 