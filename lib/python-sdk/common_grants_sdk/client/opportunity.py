"""Opportunity namespace for the CommonGrants API."""

import httpx
from typing import Callable
from uuid import UUID

from .auth import Auth
from .config import Config
from ..schemas.pydantic.models import OpportunityBase
from ..schemas.pydantic.responses import OpportunityResponse, OpportunitiesListResponse


class Opportunity:
    """Class for fetching opportunity data from CommonGrants API."""

    def __init__(
        self,
        auth: Auth,
        config: Config,
        http: httpx.Client,
        url: Callable[[str], str],
    ):
        """Initialize the Opportunity namespace.

        Args:
            auth: Authentication instance
            config: Configuration instance
            http: HTTP client for making requests
            url: Function to build full URLs from paths
        """
        self.auth = auth
        self.config = config
        self.http = http
        self.url = url

    def list(
        self,
        page: int,
    ) -> OpportunitiesListResponse:
        """Fetch a single page of opportunities.

        Args:
            page: Page number (1-indexed)

        Returns:
            OpportunitiesListResponse with items and pagination info
        """

        response = self.http.get(
            self.url("/common-grants/opportunities"),
            headers=self.auth.get_headers(),
            params={"page": page, "pageSize": self.config.page_size},
        )
        response.raise_for_status()

        return OpportunitiesListResponse.model_validate_json(response.text)

    def get(self, opp_id: str | UUID) -> OpportunityBase:
        """Get a specific opportunity by ID.

        Args:
            opp_id: The opportunity ID (UUID string or UUID object)

        Returns:
            OpportunityBase instance
        """

        response = self.http.get(
            self.url(f"/common-grants/opportunities/{opp_id}"),
            headers=self.auth.get_headers(),
        )
        response.raise_for_status()

        opp_response = OpportunityResponse.model_validate_json(response.text)

        return opp_response.data
