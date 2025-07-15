"""String filter schemas."""

from common_grants.schemas.filters.base import DefaultFilter


class StringArrayFilter(DefaultFilter):
    """Filter that matches against an array of string values."""
