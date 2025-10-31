"""Configuration management for the CommonGrants HTTP client."""

import os
from typing import Optional


class Config:
    """Configuration for CommonGrants client."""

    DEFAULT_BASE_URL = "http://localhost:8080"
    DEFAULT_API_KEY = "two_orgs_user_key"
    DEFAULT_TIMEOUT = 10.0
    PAGE_SIZE_MAX = 100

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        timeout: Optional[float] = None,
    ):
        """Initialize configuration.

        Args:
            base_url: Base URL for the API
            api_key: API key for authentication
            timeout: Request timeout in seconds
        """

        self.base_url = base_url or str(
            os.getenv("COMMON_GRANTS_BASE_URL", self.DEFAULT_BASE_URL)
        )

        self.api_key = api_key or str(
            os.getenv("COMMON_GRANTS_API_KEY", self.DEFAULT_API_KEY)
        )

        self.timeout = timeout or float(
            os.getenv("COMMON_GRANTS_TIMEOUT", self.DEFAULT_TIMEOUT)
        )

        # Validate base_url
        if not self.base_url:
            raise ValueError("base_url is required")
        if not self.base_url.startswith(("http://", "https://")):
            raise ValueError(
                f"base_url must start with http:// or https://, got: {self.base_url}"
            )
