"""Main HTTP client for the CommonGrants API."""

import httpx
from typing import Any, Optional, cast
from uuid import UUID

from .auth import Auth
from .config import Config
from .response import SuccessResponse
from .exceptions import raise_api_error
from .opportunity import Opportunity
from .types import ItemsT
from ..schemas.pydantic.pagination import PaginatedResultsInfo
from ..schemas.pydantic.responses import Paginated


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
        self.config = config or Config()
        self.auth = auth or Auth.api_key(self.config.api_key)
        self.http = httpx.Client(timeout=self.config.timeout)
        self.opportunity = Opportunity(client=self)

    def get(self, path: str, **kwargs) -> httpx.Response:
        """Simple wrapper around self.http.get.

        Args:
            path: end point path (should start with /)
            **kwargs: Additional arguments to pass to httpx.get (e.g., params, headers)

        Returns:
            httpx.Response instance
        """
        return self.http.get(
            self.url(path),
            headers=self.auth.get_headers(),
            **kwargs,
        )

    def post(self, path: str, **kwargs) -> httpx.Response:
        """Simple wrapper around self.http.post.

        Args:
            path: end point path (should start with /)
            **kwargs: Additional arguments to pass to httpx.post (e.g., json, data, params)

        Returns:
            httpx.Response instance
        """
        return self.http.post(
            self.url(path),
            headers=self.auth.get_headers(),
            **kwargs,
        )

    def get_item(
        self,
        path: str,
        item_id: str | UUID,
    ) -> SuccessResponse:
        """Get a specific item by ID from an endpoint.

        Args:
            path: end point path (should start with /)
            item_id: The item ID

        Returns:
            SuccessResponse instance with status, message, and data fields.

        Raises:
            APIError: If the API request fails
        """
        try:
            api_response = self.get(f"{path}/{item_id}")
            api_response.raise_for_status()
            result = SuccessResponse.model_validate(api_response.json())

        except httpx.HTTPError as e:
            raise_api_error(e)

        return result

    def list(
        self,
        path: str,
        page: int | None = None,
        page_size: int | None = None,
    ) -> Paginated[ItemsT]:
        """Fetch a set of items from an endpoint.

        Args:
            path: end point path (should start with /)
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
            return self.list_some_items(path, page=page, page_size=page_size)
        else:
            # Fetch ALL if page number is not defined
            return self.list_all_items(path, page_size=page_size)

    def list_all_items(
        self,
        path: str,
        page_size: int | None = None,
        params: dict[str, Any] = {},
    ) -> Paginated[ItemsT]:
        """Fetch all items across all pages from an endpoint.

        Args:
            path: end point path (should start with /)
            page_size: Number of items per page. If None, uses the default from
                client config.
            params: Additional parameters to pass to the API

        Returns:
            Paginated[ItemsT] instance with all items aggregated from all pages,
            with pagination_info summarizing the aggregated result.

        Raises:
            APIError: If the API request fails
        """
        items: list[dict] = []
        latest_response: Paginated[ItemsT] | None = None

        page = 1
        page_size = page_size or self.config.page_size

        more_pages_available = True

        # Iteratively fetch all pages
        while more_pages_available:
            # Fetch page and save items
            page_response: Paginated[ItemsT] = self.list_some_items(
                path=path, page=page, page_size=page_size, params=params
            )
            items.extend(cast(list[dict], page_response.items))
            latest_response = page_response

            # Break if max items is reached or no more pages
            if len(items) >= self.config.list_items_limit:
                more_pages_available = False
            elif (
                page_response.pagination_info.page
                >= page_response.pagination_info.total_pages
            ):
                more_pages_available = False
            else:
                page = page_response.pagination_info.page + 1
                more_pages_available = True

        # Trim items array to not exceed max items limit
        items = items[: self.config.list_items_limit]

        # Build aggregated response
        return Paginated[ItemsT](
            status=latest_response.status if latest_response else 200,
            message=latest_response.message if latest_response else "Success",
            items=cast(list[ItemsT], items),
            paginationInfo=PaginatedResultsInfo(
                page=1,
                pageSize=len(items) or page_size,
                totalItems=len(items),
                totalPages=1,
            ),
        )

    def list_some_items(
        self,
        path: str,
        page: int,
        page_size: int | None = None,
        params: dict[str, Any] | None = None,
    ) -> Paginated[ItemsT]:
        """Fetch a single page of items from an endpoint.

        Args:
            path: end point path (should start with /)
            page: Page number (1-indexed)
            page_size: Number of items per page. If None, uses the default from
                client config.

        Returns:
            Paginated[ItemsT] instance with items from the requested page

        Raises:
            APIError: If the API request fails
        """
        page_size = page_size or self.config.page_size
        if page_size < 1:
            page_size = self.config.page_size

        try:
            # TODO: if params is not None then post instead of get
            # see: https://github.com/HHS/simpler-grants-protocol/issues/386
            api_response = self.get(path, params={"page": page, "pageSize": page_size})
            api_response.raise_for_status()
            result_dict = Paginated[dict].model_validate(api_response.json())
            result = cast(Paginated[ItemsT], result_dict)

        except httpx.HTTPError as e:
            raise_api_error(e)  # Always raises, never returns

        return result

    def search(
        self,
        path: str,
        request_data: dict[str, Any],
        page: int | None = None,
        page_size: int | None = None,
    ) -> Paginated[ItemsT]:
        """
        Fetch a set of items from an endpoint based on request data

        Args:
            path: end point path (should start with /)
            request_data: Search specific request data
            page: Page number (1-indexed). If None will fetch all items across all pages and aggregate
              them into a singel repsonse.
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
            return self.search_some_items(path, request_data, page, page_size)
        else:
            return self.search_all_items(path, request_data, page_size)

    def search_all_items(
        self, path: str, request_data: dict[str, Any], page_size: int | None = None
    ) -> Paginated[ItemsT]:
        """Fetch all items across all pages from an endpoint.

        Args:
            path: end point path (should start with /)
            request_data: Search specific request data
            page_size: Number of items per page. If None, uses the default from
                client config.
            params: Additional parameters to pass to the API

        Returns:
            Paginated[ItemsT] instance with all items aggregated from all pages,
            with pagination_info summarizing the aggregated result.

        Raises:
            APIError: If the API request fails
        """

        items: list[dict] = []
        latest_response: Paginated[ItemsT] | None = None

        page = 1
        page_size = page_size or self.config.page_size

        more_pages_available = True

        # Iteratively fetch all pages
        while more_pages_available:
            # Fetch page and save items
            page_response: Paginated[ItemsT] = self.search_some_items(
                path=path, request_data=request_data, page=page, page_size=page_size
            )
            items.extend(cast(list[dict], page_response.items))
            latest_response = page_response

            # Break if max items is reached or no more pages
            if len(items) >= self.config.list_items_limit:
                more_pages_available = False
            elif (
                page_response.pagination_info.page
                >= page_response.pagination_info.total_pages
            ):
                more_pages_available = False
            else:
                page = page_response.pagination_info.page + 1
                more_pages_available = True

        # Trim items array to not exceed max items limit
        items = items[: self.config.list_items_limit]

        # Build aggregated response
        return Paginated[ItemsT](
            status=latest_response.status if latest_response else 200,
            message=latest_response.message if latest_response else "Success",
            items=cast(list[ItemsT], items),
            paginationInfo=PaginatedResultsInfo(
                page=1,
                pageSize=len(items) or page_size,
                totalItems=len(items),
                totalPages=1,
            ),
        )

    def search_some_items(
        self,
        path: str,
        request_data: dict[str, Any],
        page: int,
        page_size: int | None = None,
    ) -> Paginated[ItemsT]:
        """ "Fetch items from an end point.

        Args:
            path: end point path (should start with /)
            request_data: data to search for
            page: Page number (1-indexed)
            page_size: Number of items per page. If None, uses the default from client config
        """

        page_size = page_size or self.config.page_size

        if page_size < 1:
            page_size = self.config.page_size

        try:
            api_response = self.post(
                path, data=request_data, params={"page": page, "pageSize": page_size}
            )
            api_response.raise_for_status()
            result_dict = Paginated[dict].model_validate(api_response.json())
            result = cast(Paginated[ItemsT], result_dict)

        except httpx.HTTPError as e:
            raise_api_error(e)  # Always raises, never returns

        return result

    def url(self, path: str) -> str:
        """Construct a full URL from base URL and path.

        Args:
            path: end point path (should start with /)

        Returns:
            Complete URL string
        """
        base = self.config.base_url.rstrip("/")
        return f"{base}{path}"

    def close(self):
        """Close the HTTP client and release resources."""
        self.http.close()

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.close()
