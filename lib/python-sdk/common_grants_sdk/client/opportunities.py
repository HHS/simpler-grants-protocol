"""Opportunities resource for the CommonGrants HTTP client."""

from collections.abc import Callable
from typing import Iterator, Optional

from ..schemas.pydantic.models import OpportunityBase
from ..schemas.pydantic.responses import OpportunitiesListResponse


class OpportunitiesListIterator:
    """Iterator for paginated opportunity lists with transparent pagination."""

    def __init__(
        self,
        fetch_page: Callable[[int, int], OpportunitiesListResponse],
        paginate: bool,
        total: Optional[int],
        page: Optional[int],
        page_size: Optional[int],
    ):
        """Initialize the iterator.

        Args:
            fetch_page: Callable that takes (page, page_size) and returns
                OpportunitiesListResponse
            paginate: Whether to automatically paginate across multiple pages
            total: Maximum number of items to retrieve (None = all available)
            page: Initial page number (None = 1)
            page_size: Initial page size (None = 100)
        """
        self._fetch_page = fetch_page
        self._paginate = paginate
        self._total = total
        self._current_page = page or 1
        self._page_size = page_size or 100
        self._items_yielded = 0
        self._current_items: list[OpportunityBase] = []
        self._current_index = 0
        self._total_pages: Optional[int] = None
        self._first_request = True

    def iter_items(self) -> Iterator[OpportunityBase]:
        """Iterate over opportunity items with automatic pagination.

        Yields:
            OpportunityBase instances
        """
        while True:
            # Load next page if needed
            if self._needs_next_page():
                if not self._fetch_next_page():
                    # No more pages available
                    break

            # Yield items from current page (up to total limit if set)
            while self._can_yield_more_items():
                yield self._current_items[self._current_index]
                self._current_index += 1
                self._items_yielded += 1

            # Check termination conditions after processing current page
            if not self._should_continue():
                break

    def _should_continue(self) -> bool:
        """Check if iteration should continue after processing current page.

        Returns:
            True if there are more pages to process, False otherwise
        """
        # In non-paginating mode, only process the current page
        if not self._paginate:
            return False

        # Stop if we've reached the total item limit
        if self._total is not None and self._items_yielded >= self._total:
            return False

        # Stop if we've exceeded the total number of pages
        if self._total_pages is not None and self._current_page > self._total_pages:
            return False

        return True

    def _needs_next_page(self) -> bool:
        """Check if a new page needs to be fetched.

        Returns:
            True if current page is exhausted or this is the first request
        """
        return self._current_index >= len(self._current_items) or (
            self._first_request and len(self._current_items) == 0
        )

    def _can_yield_more_items(self) -> bool:
        """Check if more items can be yielded from the current page.

        Returns:
            True if there are more items in the current page and total limit not reached
        """
        if self._current_index >= len(self._current_items):
            return False

        if self._total is not None and self._items_yielded >= self._total:
            return False

        return True

    def _fetch_next_page(self) -> bool:
        """Fetch the next page of opportunities.

        Returns:
            True if page was fetched, False if no more pages
        """
        if self._total_pages is not None and self._current_page > self._total_pages:
            return False

        # Call the provided fetch_page callback
        list_response = self._fetch_page(self._current_page, self._page_size)

        self._current_items = list_response.items
        self._current_index = 0
        self._total_pages = list_response.pagination_info.total_pages
        self._first_request = False

        # Move to next page for next iteration
        if self._paginate:
            self._current_page += 1

        return len(self._current_items) > 0
