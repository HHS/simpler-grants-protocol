"""Award resource for the CommonGrants API."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Generic, Optional, cast, overload
from uuid import UUID

import typing_extensions as te

from ..extensions.filters import classify_filters
from ..extensions.types import AwardFiltersT
from ..schemas.pydantic.models import AwardBase
from ..schemas.pydantic.requests.award import AwdSearchRequest
from ..schemas.pydantic.responses.award import AwardT
from ..schemas.pydantic.responses.success import FilterInfo
from .results import ListResult, SearchResult, parse_batch

if TYPE_CHECKING:
    from .client import Client

# A per-call ``schema=`` override, independent of the client's bound ``AwardT``.
SchemaT = te.TypeVar("SchemaT", bound="AwardBase[Any]")


class Awards(Generic[AwardFiltersT, AwardT]):
    """Fetch award data from the CommonGrants API.

    Bound (via ``plugin.get_client``) to a plugin's registered award filter
    TypedDict (``AwardFiltersT``), so ``search(filters=...)`` is typed by it, and
    to its award model (``AwardT``): ``AwardBase`` over the plugin's
    ``AwdRecipientIndividual`` schema, e.g.
    ``AwardBase[AwdRecipientIndividual[RecipientFields]]``. Responses parse into
    ``AwardT``, or into the per-call ``schema`` override.
    """

    def __init__(self, client: "Client[Any, Any, AwardFiltersT, AwardT]"):
        """Initialize the Award resource.

        Args:
            client: Client instance for making API requests
        """
        self.client = client

    @property
    def path(self) -> str:
        """Return the API path for awards."""
        return "/common-grants/awards"

    def _schema(self, override: Optional[type[AwardBase[Any]]]) -> type[AwardBase[Any]]:
        """The schema to parse into: a per-call override, else the bound default."""
        return override if override is not None else self.client._award_schema

    @overload
    def list(
        self,
        page: int | None = None,
        page_size: int | None = None,
        schema: None = None,
    ) -> ListResult[AwardT]: ...

    @overload
    def list(
        self,
        page: int | None = None,
        page_size: int | None = None,
        *,
        schema: type[SchemaT],
    ) -> ListResult[SchemaT]: ...

    @overload
    def list(
        self,
        page: int | None,
        page_size: int | None,
        schema: type[SchemaT],
    ) -> ListResult[SchemaT]: ...

    def list(
        self,
        page: int | None = None,
        page_size: int | None = None,
        schema: Optional[type[AwardBase[Any]]] = None,
    ) -> ListResult[Any]:
        """Fetch a set of awards.

        Args:
            page: Page number (1-indexed). If None, fetches all pages.
            page_size: Number of items per page. If None, uses the client default.
            schema: Per-call parse-schema override; defaults to the plugin's award
                model (or ``AwardBase`` when unbound).

        Returns:
            ``ListResult`` — parsed ``items`` plus per-row parse ``errors``.

        Raises:
            APIError: If the API request fails
        """
        paginated = self.client.list(self.path, page=page, page_size=page_size)
        items, errors = parse_batch(
            cast("list[dict[str, Any]]", list(paginated.items)), self._schema(schema)
        )
        return ListResult(
            items=items,
            errors=errors,
            pagination_info=paginated.pagination_info,
        )

    @overload
    def get(self, awd_id: str | UUID, schema: None = None) -> AwardT: ...

    @overload
    def get(self, awd_id: str | UUID, schema: type[SchemaT]) -> SchemaT: ...

    def get(
        self,
        awd_id: str | UUID,
        schema: Optional[type[AwardBase[Any]]] = None,
    ) -> AwardBase[Any]:
        """Get a specific award by ID.

        Args:
            awd_id: The award ID
            schema: Per-call parse-schema override; defaults to the plugin's award
                model (or ``AwardBase`` when unbound).

        Returns:
            The parsed award.

        Raises:
            APIError: If the API request fails
            pydantic.ValidationError: If the response is not a valid award
        """
        success_response = self.client.get_item(self.path, awd_id)
        return self._schema(schema).model_validate(success_response.data)

    @overload
    def search(
        self,
        search: str = "",
        page: int | None = None,
        page_size: int | None = None,
        schema: None = None,
        filters: Optional[AwardFiltersT] = None,
    ) -> SearchResult[AwardT]: ...

    @overload
    def search(
        self,
        search: str = "",
        page: int | None = None,
        page_size: int | None = None,
        *,
        schema: type[SchemaT],
        filters: Optional[AwardFiltersT] = None,
    ) -> SearchResult[SchemaT]: ...

    @overload
    def search(
        self,
        search: str,
        page: int | None,
        page_size: int | None,
        schema: type[SchemaT],
        filters: Optional[AwardFiltersT] = None,
    ) -> SearchResult[SchemaT]: ...

    def search(
        self,
        search: str = "",
        page: int | None = None,
        page_size: int | None = None,
        schema: Optional[type[AwardBase[Any]]] = None,
        filters: Optional[AwardFiltersT] = None,
    ) -> SearchResult[Any]:
        """Search for awards.

        Args:
            search: The query string; omitted from the request when empty.
            page: Page number (1-indexed). If None, fetches all pages.
            page_size: Number of items per page. If None, uses the client default.
            schema: Per-call parse-schema override; defaults to the plugin's award
                model (or ``AwardBase`` when unbound).
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
            cast("list[dict[str, Any]]", list(paginated.items)), self._schema(schema)
        )

        # As for opportunities: filter_info carries the server's filter feedback only,
        # and the getattr fallbacks fire only on the empty-result path.
        server_filter_info = getattr(paginated, "filter_info", None)
        filter_info: FilterInfo[Any] = FilterInfo(
            filters=body.get("filters", {}),
            errors=list(getattr(server_filter_info, "errors", None) or []),
        )

        return SearchResult(
            items=items,
            errors=parse_errors,
            pagination_info=paginated.pagination_info,
            filter_info=filter_info,
            sort_info=getattr(paginated, "sort_info", None),
        )
