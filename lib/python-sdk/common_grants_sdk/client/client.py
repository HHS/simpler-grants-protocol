"""Main HTTP client for the CommonGrants API."""

import httpx
from typing import Optional

from .auth import Auth
from .config import Config
from .opportunity import Opportunity


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
        self.opportunity = Opportunity(
            auth=self.auth,
            config=self.config,
            http=self.http,
            url=self.url,
        )

    def url(self, path: str) -> str:
        """Construct a full URL from base URL and path.

        Args:
            path: URL path (should start with /)

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
