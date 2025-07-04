"""Encapsulates key dates in the opportunity timeline."""

import warnings

from typing import Optional

from pydantic import Field, model_validator

from common_grants_sdk.schemas.base import CommonGrantsBaseModel
from common_grants_sdk.schemas.fields import Event


class OppTimeline(CommonGrantsBaseModel):
    """Key dates and events in the lifecycle of an opportunity."""

    app_opens: Event = Field(
        ...,
        alias="appOpens",
        description="The date (and time) at which the opportunity begins accepting applications",
    )
    app_deadline: Event = Field(
        ...,
        alias="appDeadline",
        description="The final deadline for submitting applications",
    )
    other_dates: Optional[dict[str, Event]] = Field(
        default=None,
        alias="otherDates",
        description="An optional map of other key dates in the opportunity timeline",
    )

    @model_validator(mode="after")
    def validate_dates(self) -> "OppTimeline":
        """Validate that the application deadline is after the opening date."""
        if self.app_opens.date > self.app_deadline.date:
            e = f"Application deadline ({self.app_deadline.date}) "
            e = e + f"preceeds opening date ({self.app_opens.date})"
            warnings.warn(e, RuntimeWarning)
        return self
