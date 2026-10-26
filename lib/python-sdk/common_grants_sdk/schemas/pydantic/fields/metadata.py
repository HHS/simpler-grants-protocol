"""Metadata field types for the CommonGrants API."""

from pydantic import ConfigDict, Field

from ..base import CommonGrantsBaseModel
from ..types import UTCDateTime


# SystemMetadata
class SystemMetadata(CommonGrantsBaseModel):
    """System-managed metadata fields for tracking record creation and modification.

    Closed like Core's ``SystemMetadata``. Models that spread it in set their own
    ``extra`` policy (``OpportunityBase`` keeps ignoring unknown properties).
    """

    model_config = ConfigDict(extra="forbid")

    created_at: UTCDateTime = Field(
        ...,
        description="The timestamp (in UTC) at which the record was created.",
    )
    last_modified_at: UTCDateTime = Field(
        ...,
        description="The timestamp (in UTC) at which the record was last modified.",
    )


__all__ = [
    "SystemMetadata",
]
