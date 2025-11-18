"""Base resource class for CommonGrants API resources."""

from __future__ import annotations

import httpx
from typing import TYPE_CHECKING, Generic, TypeVar, cast
from uuid import UUID

from pydantic import Field

from .exceptions import raise_api_error
from ..schemas.pydantic.pagination import PaginatedResultsInfo
from ..schemas.pydantic.responses import Paginated, Success

if TYPE_CHECKING:
    from .client import Client

# Type variable for item types in paginated responses
ItemsT = TypeVar("ItemsT", default=dict)


class SuccessResponse(Success):
    """Success response with data field."""

    data: dict = Field(default_factory=dict, description="The response data")


class BaseResource(Generic[ItemsT]):
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
    ) -> Paginated[ItemsT]:
        """Fetch a set of items from an endpoint.

        Args:
            page: Page number (1-indexed). If None, method will fetch all
                items across all pages and aggregate them into a single response.
            page_size: Number of items per page. If None, uses the default from
                client config.

        Returns:
            Paginated[ItemsT] instance. When page is None, the response contains
            all items aggregated from all pages, with pagination_info summarizing
            the aggregated result.

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
    ) -> Paginated[ItemsT]:
        """Fetch all items across all pages.

        Returns:
            Paginated[ItemsT] instance with all items aggregated

        Raises:
            APIError: If the API request fails
        """
        items: list[dict] = []
        latest_response: Paginated[ItemsT] | None = None

        page = 1
        page_size = page_size or self.client.config.page_size

        more_pages_available = True

        # Iteratively fetch all pages
        while more_pages_available:
            # Get page response (type system sees Paginated[ItemsT], runtime is Paginated[dict])
            page_response = self._list_some(page=page, page_size=page_size)
            # Cast items to list[dict] for internal use since we know runtime type
            items.extend(cast(list[dict], page_response.items))
            latest_response = page_response

            if (
                page_response.pagination_info.page
                < page_response.pagination_info.total_pages
            ):
                page = page_response.pagination_info.page + 1
                more_pages_available = True
            else:
                more_pages_available = False

        # Build aggregated response
        # Use status/message from latest_response if available, otherwise use defaults
        status = latest_response.status if latest_response else 200
        message = latest_response.message if latest_response else "Success"

        # Create pagination info for aggregated result
        pagination = PaginatedResultsInfo(
            page=1,
            pageSize=max(1, len(items)) if len(items) > 0 else page_size,
            totalItems=len(items),
            totalPages=1,
        )

        # Create Paginated[ItemsT] with cast items (runtime type is dict, type system sees ItemsT)
        return Paginated[ItemsT](
            status=status,
            message=message,
            items=cast(list[ItemsT], items),
            paginationInfo=pagination,
        )

    def _list_some(
        self,
        page: int,
        page_size: int | None = None,
    ) -> Paginated[ItemsT]:
        """Fetch a single page of items.

        Args:
            page: Page number (1-indexed)
            page_size: Number of items per page

        Returns:
            Paginated[ItemsT] instance

        Raises:
            APIError: If the API request fails
        """
        page_size = page_size or self.client.config.page_size
        if page_size < 1:
            page_size = self.client.config.page_size

        try:
            api_response = self.client.http.get(
                self.client.url(self.path),
                headers=self.client.auth.get_headers(),
                params={"page": page, "pageSize": page_size},
            )
            api_response.raise_for_status()

            # Parse the JSON response
            response_data = api_response.json()

            # Hydrate Paginated[dict] from response data (JSON parsing gives dicts)
            # Cast to Paginated[ItemsT] for type system
            result_dict = Paginated[dict].model_validate(response_data)
            result = cast(Paginated[ItemsT], result_dict)

        except httpx.HTTPError as e:
            raise_api_error(e)  # Always raises, never returns

        return result

    def get(self, item_id: str | UUID) -> SuccessResponse:
        """Get a specific item by ID.

        Args:
            item_id: The item ID

        Returns:
            SuccessResponse instance with status, message, and data fields.

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

            # Hydrate SuccessResponse from response data
            result = SuccessResponse.model_validate(response_data)

        except httpx.HTTPError as e:
            raise_api_error(e)

        return result
