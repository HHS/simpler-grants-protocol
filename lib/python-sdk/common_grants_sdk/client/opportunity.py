"""Opportunity namespace for the CommonGrants API."""

import json
from typing import TYPE_CHECKING
from uuid import UUID

from ..schemas.pydantic.models import OpportunityBase
from ..schemas.pydantic.requests.opportunity import OpportunitySearchRequest
from ..schemas.pydantic.responses import (
    OpportunitiesListResponse,
    OpportunitiesSearchResponse,
    OpportunityResponse,
    Paginated,
)
from ..schemas.pydantic.models.opp_status import OppStatusOptions
from .types import ItemsT
from typing import List


if TYPE_CHECKING:
    from .client import Client


class Opportunity:
    """Class for fetching opportunity data from CommonGrants API."""

    def __init__(self, client: "Client"):
        """Initialize the Opportunity namespace.

        Args:
            client: Client instance for making API requests
        """
        self.client = client

    @property
    def path(self) -> str:
        """Return the API path for opportunities."""
        return "/common-grants/opportunities"

    @staticmethod
    def get_opp_base(opp_base: OpportunityBase | None = None) -> OpportunityBase:
        """
        Helper method to return a modified OpportunityBase if the caller has added custom fields or a default OpportunityBase if the param is None.

        Args:
            opp_base: An OpportunityBase that may have custom fields added.

        Returns:
            Either a default no custom field OpportunityBase or one that has the custom fields added by a caller.
        """
        if opp_base is None:
            return OpportunityBase
        else:
            return opp_base

    def list(
        self,
        page: int | None = None,
        page_size: int | None = None,
        opp_base: OpportunityBase | None = None
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
        # Call client method to get paginated response
        paginated_response: Paginated[ItemsT] = self.client.list(  # type: ignore[valid-type]
            self.path, page=page, page_size=page_size
        )

        # Hydrate OpportunityBase models from items dict
        items = [
            self.get_opp_base(opp_base).model_validate_json(json.dumps(item))
            for item in paginated_response.items
        ]

        # Convert paginated_response to dict and replace items with hydrated models
        response_data = paginated_response.model_dump(by_alias=True)
        response_data["items"] = items

        # Hydrate OpportunitiesListResponse from response data
        return OpportunitiesListResponse.model_validate(response_data)

    def get(self,
            opp_id: str | UUID,
            opp_base: OpportunityBase | None = None) -> OpportunityBase:
        """Get a specific opportunity by ID.

        Args:
            opp_id: The opportunity ID
            opp_base: OpportunityBase to support custom fields from caller.

        Returns:
            OpportunityBase instance

        Raises:
            APIError: If the API request fails
        """
        # Call client method to get SuccessResponse
        success_response = self.client.get_item(self.path, opp_id)

        # Hydrate OpportunityBase from response
        response_data = success_response.model_dump(by_alias=True)
        response_data["data"] = self.get_opp_base(opp_base).from_dict(success_response.data)

        # Hydrate OpportunityResponse from response data
        opportunity_response = OpportunityResponse.model_validate(response_data)

        # Return the OpportunityBase from the response
        return opportunity_response.data

    def search(
        self,
        search: str,
        status: List[OppStatusOptions],
        page: int | None = None,
        page_size: int | None = None,
        opp_base: OpportunityBase | None = None
    ) -> OpportunitiesSearchResponse:
        """Search for opportunties by a query string

        Args:
            search: The string to search for.
            status: List of statuses to search on.
            page: Page number (1-indexed). If None, method will fetch all
                items across all pages and aggregate them into a single response.
            page_size: Number of items per page. If None, uses the default from
                client config.
            opp_base: OpportunityBase to support custom fields added by the caller.  


        Returns:
            OpportunitiesSearchResponse with items and pagination info

            Raises:
                APIError: if the API request fails
        """

        request = {
            "filters": {
                "status": {"operator": "in", "value": status},
            },
            "pagination": {"page": 1, "pageSize": 10},
            "search": search,
            "sorting": {"sortBy": "lastModifiedAt", "sortOrder": "desc"},
        }

        request_data = OpportunitySearchRequest.model_validate(request)

        # Call client method to get paginated response
        paginated_response: Paginated[ItemsT] = self.client.search(  # type: ignore[valid-type]
            f"{self.path}/search",
            request_data.model_dump(by_alias=True, exclude_unset=True),
            page=page,
            page_size=page_size,
        )

        # Hydrate OpportunityBase models from items dict
        items = [
            self.get_opp_base(opp_base).model_validate_json(json.dumps(item))
            for item in paginated_response.items
        ]

        # Convert paginated_response to dict and replace items with hydrated models
        response_data = paginated_response.model_dump(by_alias=True)
        response_data["items"] = items

        response_data["sortInfo"] = {
            "sortBy": "",
            "sortOrder": "",
            "customSortBy": None,
            "errros": [],
        }

        response_data["filterInfo"] = {"filters": {}, "errors": []}

        # Hydrate OpportunitiesListResponse from response data
        return OpportunitiesSearchResponse.model_validate(response_data)
