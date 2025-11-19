"""Configuration management for the CommonGrants HTTP client."""

import os
from typing import Optional, cast


class Config:
    """Configuration for CommonGrants client."""

    DEFAULT_PAGE_SIZE = 100
    DEFAULT_TIMEOUT = 10.0
    LIST_ITEMS_LIMIT = 1000

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        timeout: Optional[float] = None,
        page_size: Optional[int] = None,
        list_items_limit: Optional[int] = LIST_ITEMS_LIMIT,
    ):
        """Initialize configuration.

        Args:
            base_url: Base URL for the API
            api_key: API key for authentication
            timeout: Request timeout in seconds
            page_size: Response max page size
        """

        # set base_url value from param or env var
        base_url_value = (
            base_url if base_url is not None else os.getenv("CG_API_BASE_URL")
        )
        if not base_url_value:
            raise ValueError("base_url is required")
        if not base_url_value.startswith(("http://", "https://")):
            raise ValueError("base_url must start with http:// or https://")
        # use type narrowing to avoid type validation errors in client
        self.base_url: str = cast(str, base_url_value)

        # set api_key value from param or env var
        api_key_value = api_key if api_key is not None else os.getenv("CG_API_KEY")
        if not api_key_value:
            raise ValueError("api_key is required")
        # use type narrowing to avoid type validation errors in client
        self.api_key: str = cast(str, api_key_value)

        # set timeout value from param, env var, or default
        timeout_value = timeout or float(
            os.getenv("CG_API_TIMEOUT", self.DEFAULT_TIMEOUT)
        )
        # use type narrowing to avoid type validation errors in client
        self.timeout: float = cast(float, timeout_value)

        # set page_size value from param, env var, or default
        page_size_value = page_size or int(
            os.getenv("CG_API_PAGE_SIZE", self.DEFAULT_PAGE_SIZE)
        )
        # use type narrowing to avoid type validation errors in client
        self.page_size: int = cast(int, page_size_value)

        # set list_items_limit value from param, env var, or default
        list_items_limit = list_items_limit or int(
            os.getenv("CG_API_LIST_ITEMS_LIMIT", self.LIST_ITEMS_LIMIT)
        )
        # use type narrowing to avoid type validation errors in client
        self.list_items_limit: int = cast(int, list_items_limit)
