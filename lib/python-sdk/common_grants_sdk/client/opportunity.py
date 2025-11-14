"""Opportunity namespace for the CommonGrants API."""

import httpx
from typing import Optional, TYPE_CHECKING
from uuid import UUID

from .exceptions import raise_api_error
from ..schemas.pydantic.models import OpportunityBase
from ..schemas.pydantic.responses import OpportunityResponse, OpportunitiesListResponse


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

    def list(
        self,
        page: int,
        page_size: Optional[int] = None,
    ) -> OpportunitiesListResponse:
        """Fetch a single page of opportunities.

        Args:
            page: Page number (1-indexed)

        Returns:
            OpportunitiesListResponse with items and pagination info

        Raises:
            APIError: If the API request fails
        """
        if page_size is None or page_size < 1:
            page_size = self.client.config.page_size

        try:
            response = self.http.get(
                self.client.url("/common-grants/opportunities"),
                headers=self.client.auth.get_headers(),
                params={"page": page, "pageSize": page_size},
            )
            response.raise_for_status()
            result = OpportunitiesListResponse.model_validate_json(response.text)

        except httpx.HTTPError as e:
            raise_api_error(e)  # Always raises, never returns

        return result

    def get(self, opp_id: str | UUID) -> OpportunityBase:
        """Get a specific opportunity by ID.

        Args:
            opp_id: The opportunity ID

        Returns:
            OpportunityBase instance

        Raises:
            APIError: If the API request fails
        """
        try:
            response = self.client.http.get(
                self.client.url(f"/common-grants/opportunities/{opp_id}"),
                headers=self.client.auth.get_headers(),
            )
            response.raise_for_status()
            opp_response = OpportunityResponse.model_validate_json(response.text)
            result = opp_response.data

        except httpx.HTTPError as e:
            raise_api_error(e)

        return result
