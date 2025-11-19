"""Type variables for the CommonGrants API client."""

from typing import TypeVar

# Type variable for item types in paginated responses
# Note: default parameter for TypeVar is only available in Python 3.13+
# For compatibility with older Python versions, we use a bound-less TypeVar
ItemsT = TypeVar("ItemsT")
