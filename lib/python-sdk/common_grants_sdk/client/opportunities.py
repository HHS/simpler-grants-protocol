"""Opportunity resource for the CommonGrants API."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Generic, List, Optional, cast
from uuid import UUID

import typing_extensions as te

from ..extensions.filters import classify_filters
from ..extensions.types import FilterError, FiltersT
from ..schemas.pydantic.models import OpportunityBase
from ..schemas.pydantic.models.opp_status import OppStatusOptions
from ..schemas.pydantic.requests.opportunity import OpportunitySearchRequest
from ..schemas.pydantic.responses.success import FilterInfo
from .results import ListResult, SearchResult, parse_batch

if TYPE_CHECKING:
    from .client import Client

# Bound is OpportunityBase[Any] (the custom-fields parameter is invariant, so a
# bare OpportunityBase bound would reject OpportunityBase[OppCustomFields]).
ItemT = te.TypeVar(
    "ItemT", bound="OpportunityBase[Any]", default="OpportunityBase[Any]"
)


class Opportunities(Generic[FiltersT, ItemT]):
    """Fetch opportunity data from the CommonGrants API.

    Bound (via ``plugin.get_client``) to a plugin's registered filter TypedDict
    (``FiltersT``) and Opportunity schema (``ItemT``): ``search(filters=...)`` is
    typed by the registered filters, and responses parse into ``ItemT`` by default.
    """

    def __init__(self, client: "Client[FiltersT, ItemT]"):
        """Initialize the Opportunity resource.

        Args:
            client: Client instance for making API requests
        """
        self.client = client

    @property
    def path(self) -> str:
        """Return the API path for opportunities."""
        return "/common-grants/opportunities"

    def _schema(
        self, override: Optional[type[OpportunityBase]]
    ) -> type[OpportunityBase]:
        """The schema to parse into: a per-call override, else the bound default."""
        return override if override is not None else self.client._opportunity_schema

    def list(
        self,
        page: int | None = None,
        page_size: int | None = None,
        schema: Optional[type[OpportunityBase]] = None,
    ) -> ListResult[ItemT]:
        """Fetch a set of opportunities.

        Args:
            page: Page number (1-indexed). If None, fetches all pages.
            page_size: Number of items per page. If None, uses the client default.
            schema: Per-call parse-schema override; defaults to the plugin's
                Opportunity schema (or ``OpportunityBase`` when unbound).

        Returns:
            ``ListResult`` — parsed ``items`` plus per-row parse ``errors``.

        Raises:
            APIError: If the API request fails
        """
        resolved = self._schema(schema)
        paginated = self.client.list(self.path, page=page, page_size=page_size)
        items, errors = parse_batch(
            cast("list[dict[str, Any]]", list(paginated.items)), resolved
        )
        return ListResult(
            items=cast("list[ItemT]", items),
            errors=errors,
            pagination_info=paginated.pagination_info,
        )

    def get(
        self,
        opp_id: str | UUID,
        schema: Optional[type[OpportunityBase]] = None,
    ) -> ItemT:
        """Get a specific opportunity by ID.

        Args:
            opp_id: The opportunity ID
            schema: Per-call parse-schema override; defaults to the plugin's
                Opportunity schema (or ``OpportunityBase`` when unbound).

        Returns:
            The parsed opportunity (``ItemT``).

        Raises:
            APIError: If the API request fails
        """
        resolved = self._schema(schema)
        success_response = self.client.get_item(self.path, opp_id)
        return cast("ItemT", resolved.model_validate(success_response.data))

    def search(
        self,
        search: str = "",
        status: List[OppStatusOptions] | None = None,
        page: int | None = None,
        page_size: int | None = None,
        schema: Optional[type[OpportunityBase]] = None,
        filters: Optional[FiltersT] = None,
    ) -> SearchResult[ItemT]:
        """Search for opportunities.

        Args:
            search: The query string.
            status: Statuses to filter on (shorthand for the ``status`` filter).
                Deprecated — pass status through ``filters`` instead; this
                shorthand will be removed in a future release.
            page: Page number (1-indexed). If None, fetches all pages.
            page_size: Number of items per page. If None, uses the client default.
            schema: Per-call parse-schema override; defaults to the plugin's
                Opportunity schema (or ``OpportunityBase`` when unbound).
            filters: Typed filter dict — registered keys are validated against the
                plugin's route filters, standard keys against their models, and
                ad-hoc (unregistered) keys against the known-filter-model union. Any
                invalid value raises ``FilterError`` before a request is sent.

        Returns:
            ``SearchResult`` — parsed ``items``, per-row parse ``errors``, and
            ``filter_info`` carrying the server's filter feedback.

        Raises:
            APIError: If the API request fails.
            FilterError: If any filter value — or the ``status`` shorthand — is
                invalid or conflicting.
        """
        resolved = self._schema(schema)

        # classify_filters raises FilterError on the first invalid filter value,
        # whether it is a standard, registered, or ad-hoc filter, before any request
        # is sent. The filter_info.errors field is reserved for errors the server
        # reports about the filters it received.
        filters_body: dict[str, Any] = {}
        if filters:
            classified = classify_filters(
                self.client._routes, "opportunities", "search", filters
            )
            filters_body = classified.model_dump(
                by_alias=True, exclude_none=True, mode="json"
            )

        if status:
            if "status" in filters_body:
                # ``status`` given via both the shorthand and ``filters``:
                # conflicting input to a standard filter — raise, don't guess.
                raise FilterError(
                    "status specified via both the status shorthand and the "
                    "filters argument; pass it through only one of them",
                    path="filters.status",
                    source_value=status,
                )
            # str values (not enum members) so filter_info.filters echoes
            # the same shape as the classified path.
            filters_body["status"] = {
                "operator": "in",
                "value": [s.value for s in status],
            }

        request: dict[str, Any] = {
            "pagination": {"page": 1, "pageSize": 10},
            "search": search,
            "sorting": {"sortBy": "lastModifiedAt", "sortOrder": "desc"},
        }
        if filters_body:
            request["filters"] = filters_body

        request_data = OpportunitySearchRequest.model_validate(request)

        # mode="json" so date filter values serialize to ISO strings — httpx encodes
        # json= with stdlib json, which rejects the date objects pydantic parses to.
        paginated = self.client.search(
            f"{self.path}/search",
            request_data.model_dump(by_alias=True, exclude_unset=True, mode="json"),
            page=page,
            page_size=page_size,
        )

        items, parse_errors = parse_batch(
            cast("list[dict[str, Any]]", list(paginated.items)), resolved
        )

        # filter_info carries the server's filter feedback only — client-side
        # filter problems already raised above. sort/filter info are preserved
        # through page-aggregation (pagination copies the first page's Filtered
        # envelope); the getattr fallbacks fire only on the empty-result path,
        # which returns a plain Paginated.
        server_filter_info = getattr(paginated, "filter_info", None)
        server_errors = list(getattr(server_filter_info, "errors", None) or [])
        filter_info: FilterInfo[Any] = FilterInfo(
            filters=filters_body,
            errors=server_errors,
        )

        return SearchResult(
            items=cast("list[ItemT]", items),
            errors=parse_errors,
            pagination_info=paginated.pagination_info,
            filter_info=filter_info,
            sort_info=getattr(paginated, "sort_info", None),
        )
