"""Opportunity namespace for the CommonGrants API."""

import json
from typing import TYPE_CHECKING
from typing_extensions import override
from uuid import UUID

from .base import BaseResource
from ..schemas.pydantic.models import OpportunityBase
from ..schemas.pydantic.responses import OpportunitiesListResponse, OpportunityResponse


if TYPE_CHECKING:
    from .client import Client


class Opportunity(BaseResource):
    """Class for fetching opportunity data from CommonGrants API."""

    def __init__(self, client: "Client"):
        """Initialize the Opportunity namespace.

        Args:
            client: Client instance for making API requests
        """
        super().__init__(client, "/common-grants/opportunities")

    @override
    def list(  # type: ignore[override]
        self,
        page: int | None = None,
        page_size: int | None = None,
    ) -> OpportunitiesListResponse:
        """Fetch a set of opportunities.

        Args:
            page: Page number (1-indexed). If None, method will fetch all
                items across all pages and aggregate them into a single response.
            page_size: Number of items per page. If None, uses the default from
                client config.

        Returns:
            OpportunitiesListResponse instance. When page is None, the response
            contains all items aggregated from all pages, with pagination_info
            summarizing the aggregated result.

        Raises:
            APIError: If the API request fails
        """
        # Call parent method to get paginated response
        paginated_response = super().list(page=page, page_size=page_size)

        # Hydrate OpportunityBase models from items dict
        items = [
            OpportunityBase.model_validate_json(json.dumps(item))
            for item in paginated_response.items
        ]

        # Convert paginated_response to dict and replace items with hydrated models
        response_data = paginated_response.model_dump(by_alias=True)
        response_data["items"] = items

        # Hydrate OpportunitiesListResponse from response data
        return OpportunitiesListResponse.model_validate(response_data)

    @override
    def get(self, opp_id: str | UUID) -> OpportunityBase:  # type: ignore[override]
        """Get a specific opportunity by ID.

        Args:
            opp_id: The opportunity ID

        Returns:
            OpportunityBase instance

        Raises:
            APIError: If the API request fails
        """
        # Call parent method to get SuccessResponse
        success_response = super().get(opp_id)

        # Hydrate OpportunityBase from data dict (handles string->type conversions)
        data_dict: dict = success_response.data or {}
        opportunity = OpportunityBase.from_dict(data_dict)

        # Convert SuccessResponse to dict and replace data with hydrated OpportunityBase
        response_data = success_response.model_dump(by_alias=True)
        response_data["data"] = opportunity

        # Hydrate OpportunityResponse from response data
        opportunity_response = OpportunityResponse.model_validate(response_data)

        # Return the OpportunityBase from the response
        return opportunity_response.data
