"""Type variables for the CommonGrants API client."""

from typing import TypeVar

# Type variable for item types in paginated responses
ItemsT = TypeVar("ItemsT", default=dict)
