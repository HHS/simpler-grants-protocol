"""Main HTTP client for the CommonGrants API."""

import httpx
from typing import Optional
from uuid import UUID

from .auth import Auth
from .config import Config
from .opportunities import OpportunitiesListIterator
from ..schemas.pydantic.models import OpportunityBase
from ..schemas.pydantic.responses import OpportunityResponse, OpportunitiesListResponse


class Client:
    """HTTP client for interacting with the CommonGrants API."""

    def __init__(
        self,
        config: Optional[Config] = None,
        auth: Optional[Auth] = None,
    ):
        """Initialize the CommonGrants client.

        Args:
            config: Optional Config instance
            auth: Optional Auth instance
        """
        self._config = config or Config()
        self._auth = auth or Auth.api_key(self._config.api_key)
        self._http_client = httpx.Client(timeout=self._config.timeout)

    def _url(self, path: str) -> str:
        """Construct a full URL from base URL and path.

        Args:
            path: URL path (should start with /)

        Returns:
            Complete URL string
        """
        base = self._config.base_url.rstrip("/")
        return f"{base}{path}"

    def list_opportunities(
        self,
        paginate: bool = False,
        total: Optional[int] = None,
        page: Optional[int] = None,
        page_size: Optional[int] = None,
    ) -> OpportunitiesListIterator:
        """List opportunities with optional transparent pagination.

        Args:
            paginate: If True, automatically fetch multiple pages. If False, only
                fetch the requested page (default: False)
            total: Maximum number of items to retrieve when paginate=True.
                None means fetch all available (default: None)
            page: Page number to start from (1-indexed). Only used if paginate=False
                or for the first page when paginate=True (default: 1)
            page_size: Number of items per page (default: 100, max: Config.PAGE_SIZE_MAX)

        Returns:
            OpportunitiesListIterator that can be used to iterate over items
        """
        if page_size is not None and page_size > Config.PAGE_SIZE_MAX:
            page_size = Config.PAGE_SIZE_MAX

        return OpportunitiesListIterator(
            fetch_page=self._fetch_opportunities_page,
            paginate=paginate,
            total=total,
            page=page,
            page_size=page_size or Config.PAGE_SIZE_MAX,
        )

    def _fetch_opportunities_page(
        self, page: int, page_size: int
    ) -> OpportunitiesListResponse:
        """Fetch a single page of opportunities.

        Args:
            page: Page number (1-indexed)
            page_size: Number of items per page

        Returns:
            OpportunitiesListResponse with items and pagination info
        """

        response = self._http_client.get(
            self._url("/common-grants/opportunities"),
            headers=self._auth.get_headers(),
            params={"page": page, "pageSize": page_size},
        )
        response.raise_for_status()

        return OpportunitiesListResponse.model_validate_json(response.text)

    def get_opportunity(self, opp_id: str | UUID) -> OpportunityBase:
        """Get a specific opportunity by ID.

        Args:
            opp_id: The opportunity ID (UUID string or UUID object)

        Returns:
            OpportunityBase instance
        """

        response = self._http_client.get(
            self._url(f"/common-grants/opportunities/{opp_id}"),
            headers=self._auth.get_headers(),
        )
        response.raise_for_status()

        opp_response = OpportunityResponse.model_validate_json(response.text)

        return opp_response.data

    def close(self):
        """Close the HTTP client and release resources."""
        self._http_client.close()

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close()
