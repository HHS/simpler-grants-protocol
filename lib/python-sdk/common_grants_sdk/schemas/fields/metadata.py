"""Metadata field types for the CommonGrants API."""

from pydantic import Field

from common_grants_sdk.schemas.base import CommonGrantsBaseModel
from common_grants_sdk.schemas.types import UTCDateTime


# SystemMetadata
class SystemMetadata(CommonGrantsBaseModel):
    """System-managed metadata fields for tracking record creation and modification."""

    created_at: UTCDateTime = Field(
        ...,
        alias="createdAt",
        description="The timestamp (in UTC) at which the record was created.",
    )
    last_modified_at: UTCDateTime = Field(
        ...,
        alias="lastModifiedAt",
        description="The timestamp (in UTC) at which the record was last modified.",
    )


__all__ = [
    "SystemMetadata",
]
