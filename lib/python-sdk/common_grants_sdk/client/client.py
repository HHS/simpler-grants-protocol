"""Main HTTP client for the CommonGrants API."""

import httpx
from typing import Any, Optional, cast
from uuid import UUID

from .auth import Auth
from .config import Config
from .response import SuccessResponse
from .exceptions import raise_api_error
from .opportunity import Opportunity
from .pagination import pagination
from .types import ItemsT
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
            config: Optional Config instance. If None, a default Config is created.
            auth: Optional Auth instance. If None, API key authentication is used
                with the key from config.
        """
        self.config = config or Config()
        self.auth = auth or Auth.api_key(self.config.api_key)
        self.http = httpx.Client(timeout=self.config.timeout)
        self.opportunity = Opportunity(client=self)

    def post(self, path: str, **kwargs) -> httpx.Response:
        """Simple wrapper around self.http.post.

        Automatically adds authentication headers to the request.

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

    def get(self, path: str, **kwargs) -> httpx.Response:
        """Simple wrapper around self.http.get.

        Automatically adds authentication headers to the request.

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

    def get_item(
        self,
        path: str,
        item_id: str | UUID,
    ) -> SuccessResponse:
        """Get a specific item by ID from an endpoint.

        Makes a GET request to {path}/{item_id}.

        Args:
            path: end point path (should start with /)
            item_id: The item ID (string or UUID)

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

    @pagination
    def list(
        self,
        path: str,
        page: int | None = None,
        page_size: int | None = None,
        params: dict[str, Any] | None = None,
    ) -> Paginated[ItemsT]:
        """Fetch a set of items from an endpoint using a GET request.

        Args:
            path: end point path (should start with /)
            page: Page number (1-indexed). If None, method will fetch all
                items across all pages and aggregate them into a single response.
                When fetching all pages, the number of items is limited by
                config.list_items_limit.
            page_size: Number of items per page. If None, uses the default from
                client config.
            params: Additional parameters to pass to the API. These are merged
                with pagination parameters (page, pageSize).

        Returns:
            Paginated[ItemsT] instance. When page is None, the response contains
            all items aggregated from all pages (up to list_items_limit), with
            pagination_info summarizing the aggregated result.

        Raises:
            APIError: If the API request fails
        """
        page_size = page_size or self.config.page_size
        if page_size < 1:
            page_size = self.config.page_size

        try:
            request_params = {"page": page, "pageSize": page_size}
            if params:
                request_params.update(params)
            api_response = self.get(path, params=request_params)
            api_response.raise_for_status()
            result_dict = Paginated[dict].model_validate(api_response.json())
            result = cast(Paginated[ItemsT], result_dict)

        except httpx.HTTPError as e:
            raise_api_error(e)  # Always raises, never returns

        return result

    @pagination
    def search(
        self,
        path: str,
        request_data: dict[str, Any],
        page: int | None = None,
        page_size: int | None = None,
    ) -> Paginated[ItemsT]:
        """Fetch a set of items from an endpoint based on request data using a POST request.

        Args:
            path: end point path (should start with /)
            request_data: search specific request data (sent in request body as form data)
            page: Page number (1-indexed). If None, will fetch all items across all pages
                and aggregate them into a single response. When fetching all pages, the
                number of items is limited by config.list_items_limit.
            page_size: Number of items per page. If None, uses the default from
                client config.

        Returns:
            Paginated[ItemsT] instance. When page is None, the response contains
            all items aggregated from all pages (up to list_items_limit), with
            pagination_info summarizing the aggregated result.

        Raises:
            APIError: If the API request fails
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

        Trailing slashes are automatically stripped from the base URL before
        concatenation.

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
        """Context manager entry.

        Returns:
            The Client instance
        """
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit.

        Automatically closes the HTTP client when exiting the context.
        """
        self.close()
