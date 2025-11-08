"""Configuration management for the CommonGrants HTTP client."""

import os
from typing import Optional


class Config:
    """Configuration for CommonGrants client."""

    DEFAULT_PAGE_SIZE = 100
    DEFAULT_TIMEOUT = 10.0

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        timeout: Optional[float] = None,
        page_size: Optional[int] = None,
    ):
        """Initialize configuration.

        Args:
            base_url: Base URL for the API
            api_key: API key for authentication
            timeout: Request timeout in seconds
            page_size: Response max page size
        """

        # set base_url value from param or env var
        env_base_url = os.getenv("CG_API_BASE_URL")
        self.base_url = base_url if base_url is not None else env_base_url
        if not self.base_url:
            raise ValueError("base_url is required")
        if not self.base_url.startswith(("http://", "https://")):
            raise ValueError("base_url must start with http:// or https://")

        # set api_key value from param or env var
        env_api_key = os.getenv("CG_API_KEY")
        self.api_key = api_key if api_key is not None else env_api_key
        if not self.api_key:
            raise ValueError("api_key is required")

        # set timeout value from param, env var, or default
        self.timeout = timeout or float(
            os.getenv("CG_API_TIMEOUT", self.DEFAULT_TIMEOUT)
        )

        # set page_size value from param, env var, or default
        self.page_size = page_size or int(
            os.getenv("CG_API_PAGE_SIZE", self.DEFAULT_PAGE_SIZE)
        )
