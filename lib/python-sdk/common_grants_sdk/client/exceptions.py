"""Exception classes for the CommonGrants API client."""

import httpx

from ..schemas.pydantic.responses import Error


class APIError(Exception):
    """Exception raised when an API request fails.

    Attributes:
        error: Instance of pydantic Error class
    """

    def __init__(self, error: Error):
        """Initialize class instance.

        Args:
            error: Instance of pydantic Error class
        """
        self.error = error
        super().__init__(error.message)

    def __str__(self) -> str:
        return f"{self.error.status}: {self.error.message}"


def raise_api_error(httpx_error: httpx.HTTPError) -> None:
    """Convert httpx error to APIError instance.

    Args:
        httpx_error: An httpx.HTTPError instance

    Raises:
        APIError: Instance of APIError class
    """

    # Handle errors that contain HTTP response (i.e. the server received the request)
    if isinstance(httpx_error, httpx.HTTPStatusError):
        error = Error.model_validate_json(httpx_error.response.text)
        raise APIError(error)

    # Handle errors that do not contain HTTP responses (e.g. network errors etc.)
    raise APIError(
        Error(
            status=0,
            message=str(httpx_error),
            errors=[],
        )
    )
