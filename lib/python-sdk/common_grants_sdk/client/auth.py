"""Authentication classes for the CommonGrants HTTP client."""


class Auth:
    """Authentication configuration for API requests."""

    def __init__(self, headers: dict[str, str]):
        """Initialize auth with custom headers.

        Args:
            headers: Dictionary of headers to include in requests
        """
        self._headers = headers.copy()
        self._headers["Accept"] = "application/json"

    @classmethod
    def api_key(cls, key: str) -> "Auth":
        """Create auth using API key (X-API-Key header).

        Args:
            key: The API key

        Returns:
            Auth instance configured with API key
        """
        return cls(headers={"X-API-Key": key})

    @classmethod
    def bearer(cls, token: str) -> "Auth":
        """Create auth using bearer token (Authorization header).

        Args:
            token: The bearer token

        Returns:
            Auth instance configured with bearer token
        """
        return cls(headers={"Authorization": f"Bearer {token}"})

    def get_headers(self) -> dict[str, str]:
        """Get headers for API requests.

        Returns:
            Dictionary of headers
        """
        return self._headers.copy()
