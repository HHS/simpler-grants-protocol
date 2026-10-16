"""Award resource for the CommonGrants API."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Generic, Optional, cast
from uuid import UUID

from ..extensions.filters import classify_filters
from ..extensions.types import AwardFiltersT
from ..schemas.pydantic.models import AwardBase
from ..schemas.pydantic.requests.award import AwdSearchRequest
from ..schemas.pydantic.responses.award import AwardT
from ..schemas.pydantic.responses.success import FilterInfo
from .results import ListResult, SearchResult, parse_batch

if TYPE_CHECKING:
    from .client import Client


class Awards(Generic[AwardFiltersT]):
    """Fetch award data from the CommonGrants API.

    Bound (via ``plugin.get_client``) to a plugin's registered award filter
    TypedDict (``AwardFiltersT``), so ``search(filters=...)`` is typed by it.
    Responses parse into ``AwardBase``, or into the per-call ``schema`` override
    (e.g. ``AwardBase[AwdRecipientIndividual[RecipientFields]]``).
    """

    def __init__(self, client: "Client[Any, Any, AwardFiltersT]"):
        """Initialize the Award resource.

        Args:
            client: Client instance for making API requests
        """
        self.client = client

    @property
    def path(self) -> str:
        """Return the API path for awards."""
        return "/common-grants/awards"

    def list(
        self,
        page: int | None = None,
        page_size: int | None = None,
        schema: Optional[type[AwardT]] = None,
    ) -> ListResult[AwardT]:
        """Fetch a set of awards.

        Args:
            page: Page number (1-indexed). If None, fetches all pages.
            page_size: Number of items per page. If None, uses the client default.
            schema: Per-call parse-schema override; defaults to ``AwardBase``.

        Returns:
            ``ListResult`` — parsed ``items`` plus per-row parse ``errors``.

        Raises:
            APIError: If the API request fails
        """
        paginated = self.client.list(self.path, page=page, page_size=page_size)
        items, errors = parse_batch(
            cast("list[dict[str, Any]]", list(paginated.items)), schema or AwardBase
        )
        return ListResult(
            items=cast("list[AwardT]", items),
            errors=errors,
            pagination_info=paginated.pagination_info,
        )

    def get(
        self,
        awd_id: str | UUID,
        schema: Optional[type[AwardT]] = None,
    ) -> AwardT:
        """Get a specific award by ID.

        Args:
            awd_id: The award ID
            schema: Per-call parse-schema override; defaults to ``AwardBase``.

        Returns:
            The parsed award.

        Raises:
            APIError: If the API request fails
            pydantic.ValidationError: If the response is not a valid award
        """
        success_response = self.client.get_item(self.path, awd_id)
        return cast(
            "AwardT", (schema or AwardBase).model_validate(success_response.data)
        )

    def search(
        self,
        search: str = "",
        page: int | None = None,
        page_size: int | None = None,
        schema: Optional[type[AwardT]] = None,
        filters: Optional[AwardFiltersT] = None,
    ) -> SearchResult[AwardT]:
        """Search for awards.

        Args:
            search: The query string; omitted from the request when empty.
            page: Page number (1-indexed). If None, fetches all pages.
            page_size: Number of items per page. If None, uses the client default.
            schema: Per-call parse-schema override; defaults to ``AwardBase``.
            filters: Typed filter dict — the standard award filters (``status``,
                ``opportunity_id``, ``award_date_range``, ``awarded_amount_range``,
                snake_case or camelCase) are validated against the award models and
                sent by their camelCase names; registered keys are validated against
                the plugin's award route filters and ad-hoc (unregistered) keys
                against the known-filter-model union, both sent under
                ``customFilters`` by the name given. Any invalid value raises
                ``FilterError`` before a request is sent.

        Returns:
            ``SearchResult`` — parsed ``items``, per-row parse ``errors``, and
            ``filter_info`` carrying the server's filter feedback.

        Raises:
            APIError: If the API request fails.
            FilterError: If any filter value is invalid or conflicting.
        """
        request: dict[str, Any] = {}
        if search:
            request["search"] = search
        if filters:
            # Raises FilterError on the first invalid filter, before any request.
            request["filters"] = classify_filters(
                self.client._routes, "awards", "search", filters
            ).model_dump(by_alias=True, exclude_unset=True, mode="json")

        # Core award requests are sealed and optional-not-nullable: send only what
        # was given. BaseClient.search adds each page's body pagination.
        body = AwdSearchRequest.model_validate(request).model_dump(
            by_alias=True, exclude_unset=True, mode="json"
        )
        paginated = self.client.search(
            f"{self.path}/search", body, page=page, page_size=page_size
        )

        items, parse_errors = parse_batch(
            cast("list[dict[str, Any]]", list(paginated.items)), schema or AwardBase
        )

        # As for opportunities: filter_info carries the server's filter feedback only,
        # and the getattr fallbacks fire only on the empty-result path.
        server_filter_info = getattr(paginated, "filter_info", None)
        filter_info: FilterInfo[Any] = FilterInfo(
            filters=body.get("filters", {}),
            errors=list(getattr(server_filter_info, "errors", None) or []),
        )

        return SearchResult(
            items=cast("list[AwardT]", items),
            errors=parse_errors,
            pagination_info=paginated.pagination_info,
            filter_info=filter_info,
            sort_info=getattr(paginated, "sort_info", None),
        )
