"""Base resource class for CommonGrants API resources."""

from __future__ import annotations

import httpx
from typing import TYPE_CHECKING
from uuid import UUID

from .exceptions import raise_api_error
from ..schemas.pydantic.pagination import PaginatedResultsInfo
from ..schemas.pydantic.responses import DefaultResponse

if TYPE_CHECKING:
    from .client import Client


class BaseResource:
    """Base class to encapsulate common methods for API resources."""

    def __init__(self, client: "Client", path: str):
        """Initialize the base resource.

        Args:
            client: Client instance for making API requests
            path: Base path for the resource (e.g., "/common-grants/opportunities")
        """
        self.client = client
        self.path = path

    def list(
        self,
        page: int | None = None,
        page_size: int | None = None,
    ) -> tuple[DefaultResponse, list[dict], PaginatedResultsInfo]:
        """Fetch a set of items from an endpoint.

        Args:
            page: Page number (1-indexed). If None, method will fetch all
                items across all pages and aggregate them into a single response.
            page_size: Number of items per page. If None, uses the default from
                client config.

        Returns:
            Tuple of (DefaultResponse, list[dict], PaginatedResultsInfo).
            When page is None, the response contains all items aggregated from
            all pages, with pagination_info summarizing the aggregated result.

        Raises:
            APIError: If the API request fails
        """
        if page:
            # Fetch SOME if page number is defined
            return self._list_some(page=page, page_size=page_size)
        else:
            # Fetch ALL if page number is not defined
            return self._list_all(page_size=page_size)

    def _list_all(
        self,
        page_size: int | None = None,
    ) -> tuple[DefaultResponse, list[dict], PaginatedResultsInfo]:  # type: ignore[valid-type]
        """Fetch all items across all pages.

        Returns:
            Tuple of (DefaultResponse, list[dict], PaginatedResultsInfo) with
            all items aggregated

        Raises:
            APIError: If the API request fails
        """
        items: list[dict] = []
        latest_response: DefaultResponse | None = None

        page = 1
        page_size = page_size or self.client.config.page_size

        more_pages_available = True

        # Iteratively fetch all pages
        while more_pages_available:
            api_response, page_items, pagination = self._list_some(
                page=page, page_size=page_size
            )
            items.extend(page_items)
            latest_response = api_response

            if pagination.page < pagination.total_pages:
                page = pagination.page + 1
                more_pages_available = True
            else:
                more_pages_available = False

        response = latest_response or DefaultResponse(status=200, message="Success")
        pagination = PaginatedResultsInfo(
            page=1,
            pageSize=max(1, len(items)) if len(items) > 0 else page_size,
            totalItems=len(items),
            totalPages=1,
        )

        return (
            response,
            items,
            pagination,
        )

    def _list_some(
        self,
        page: int,
        page_size: int | None = None,
    ) -> tuple[DefaultResponse, list[dict], PaginatedResultsInfo]:  # type: ignore[valid-type]
        """Fetch a single page of items.

        Args:
            page: Page number (1-indexed)
            page_size: Number of items per page

        Returns:
            Tuple of (DefaultResponse, list[dict], PaginatedResultsInfo)

        Raises:
            APIError: If the API request fails
        """
        try:
            page_size = page_size or self.client.config.page_size
            if page_size < 1:
                page_size = self.client.config.page_size
            api_response = self.client.http.get(
                self.client.url(self.path),
                headers=self.client.auth.get_headers(),
                params={"page": page, "pageSize": page_size},
            )
            api_response.raise_for_status()

            # Parse the JSON response
            response_data = api_response.json()

            # Hydrate DefaultResponse from response data
            base_response = DefaultResponse.model_validate(response_data)

            # Extract items as list of dicts from response data
            items = response_data.get("items", [])

            # Extract pagination info from response data
            pagination = PaginatedResultsInfo.model_validate(
                response_data.get("paginationInfo", {})
            )

        except httpx.HTTPError as e:
            raise_api_error(e)  # Always raises, never returns

        return (base_response, items, pagination)

    def get(self, item_id: str | UUID) -> tuple[DefaultResponse, dict]:
        """Get a specific item by ID.

        Args:
            item_id: The item ID

        Returns:
            Tuple of (DefaultResponse, dict) where dict contains the item data

        Raises:
            APIError: If the API request fails
        """
        try:
            api_response = self.client.http.get(
                self.client.url(f"{self.path}/{item_id}"),
                headers=self.client.auth.get_headers(),
            )
            api_response.raise_for_status()

            # Parse the JSON response
            response_data = api_response.json()

            # Hydrate DefaultResponse from response data
            base_response = DefaultResponse.model_validate(response_data)

            # Extract item as dict from response data
            data = response_data.get("data", {})

        except httpx.HTTPError as e:
            raise_api_error(e)

        return (base_response, data)
