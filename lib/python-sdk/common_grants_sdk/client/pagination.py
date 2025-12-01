"""Pagination decorator for client methods.

This decorator adds automatic pagination support to methods that fetch a single
page of results. When the `page` parameter is None, it automatically fetches all
pages and aggregates the results.
"""

import inspect
from functools import wraps
from typing import TYPE_CHECKING, Any, Callable, cast

from .types import ItemsT
from ..schemas.pydantic.pagination import PaginatedResultsInfo
from ..schemas.pydantic.responses import Paginated

if TYPE_CHECKING:
    from .client import Client


def pagination(single_page_func: Callable) -> Callable:
    """Decorator that adds pagination support to a single-page fetching function.

    The decorated function will:
    - If `page` is provided: fetch only that page (calls original function directly)
    - If `page` is None: fetch all pages iteratively and aggregate results into
      a single response, limited by config.list_items_limit

    When fetching all pages:
    - Starts at page 1 and continues until all pages are fetched or the limit
      is reached
    - Aggregates all items from all pages into a single list
    - Returns a Paginated response with aggregated pagination info (page=1,
      totalItems=aggregated count, totalPages=1)

    Args:
        single_page_func: A function that fetches a single page. Must be a method
            of the Client class that accepts `page` and `page_size` parameters
            (either as positional or keyword arguments) and returns Paginated[ItemsT].
            The function signature can include additional parameters (e.g., `path`,
            `request_data`, `params`) which will be preserved.

    Returns:
        A wrapper function with the same signature as the original, but with
        `page` and `page_size` as optional keyword arguments (defaulting to None).
        When `page` is None, the wrapper handles fetching all pages automatically.
    """
    sig = inspect.signature(single_page_func)

    @wraps(single_page_func)
    def wrapper(
        self: "Client",
        *args: Any,
        page: int | None = None,
        page_size: int | None = None,
        **kwargs: Any,
    ) -> Paginated[ItemsT]:
        # Remove page and page_size from kwargs if present to avoid conflicts
        kwargs.pop("page", None)
        kwargs.pop("page_size", None)

        # If page is specified, just call the original function
        if page is not None:
            # Reconstruct the call with the provided page
            bound = sig.bind(self, *args, page=page, page_size=page_size, **kwargs)
            bound.apply_defaults()
            return single_page_func(*bound.args, **bound.kwargs)

        # Otherwise, fetch all pages
        items: list[dict] = []
        latest_response: Paginated[ItemsT] | None = None

        current_page = 1
        page_size = page_size or self.config.page_size

        more_pages_available = True

        # Iteratively fetch all pages
        while more_pages_available:
            # Fetch page and save items - update kwargs to set page
            bound = sig.bind(
                self, *args, page=current_page, page_size=page_size, **kwargs
            )
            bound.apply_defaults()
            page_response: Paginated[ItemsT] = single_page_func(
                *bound.args, **bound.kwargs
            )
            items.extend(cast(list[dict], page_response.items))
            latest_response = page_response

            # Break if max items is reached or no more pages
            if len(items) >= self.config.list_items_limit:
                more_pages_available = False
            elif (
                page_response.pagination_info.page
                >= page_response.pagination_info.total_pages
            ):
                more_pages_available = False
            else:
                current_page = page_response.pagination_info.page + 1
                more_pages_available = True

        # Trim items array to not exceed max items limit
        items = items[: self.config.list_items_limit]

        # Build aggregated response
        # Preserve any extra fields from the latest response (like sortInfo, filterInfo)
        extra_fields = {}
        if latest_response:
            response_dict = latest_response.model_dump(by_alias=True)
            # Extract fields that aren't part of the base Paginated model
            for key in response_dict:
                if key not in {"status", "message", "items", "paginationInfo"}:
                    extra_fields[key] = response_dict[key]

        return Paginated[ItemsT](
            status=latest_response.status if latest_response else 200,
            message=latest_response.message if latest_response else "Success",
            items=cast(list[ItemsT], items),
            paginationInfo=PaginatedResultsInfo(
                page=1,
                pageSize=len(items) or page_size,
                totalItems=len(items),
                totalPages=1,
            ),
            **extra_fields,
        )

    return wrapper
