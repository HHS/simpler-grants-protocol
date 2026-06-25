"""Opportunity namespace for the CommonGrants API."""

import json
from typing import TYPE_CHECKING, Type
from uuid import UUID

from ..schemas.pydantic.models import OpportunityBase
from ..schemas.pydantic.requests.opportunity import OpportunitySearchRequest
from ..schemas.pydantic.responses import (
    OpportunitiesListResponse,
    OpportunitiesSearchResponse,
    OpportunityResponse,
    Paginated,
)
from ..schemas.pydantic.models.opp_status import OppStatusOptions
from ..extensions.filters import classify_filters
from ..extensions.types import PluginRoutes
from .types import ItemsT
from typing import Any, List, Mapping

if TYPE_CHECKING:
    from .client import Client


class Opportunities:
    """Class for fetching opportunity data from CommonGrants API."""

    def __init__(self, client: "Client"):
        """Initialize the Opportunity namespace.

        Args:
            client: Client instance for making API requests
        """
        self.client = client

    @property
    def path(self) -> str:
        """Return the API path for opportunities."""
        return "/common-grants/opportunities"

    def list(
        self,
        page: int | None = None,
        page_size: int | None = None,
        schema: Type[OpportunityBase] | None = OpportunityBase,
    ) -> OpportunitiesListResponse:
        """Fetch a set of opportunities.

        Args:
            page: Page number (1-indexed). If None, method will fetch all
                items across all pages and aggregate them into a single response.
            page_size: Number of items per page. If None, uses the default from
                client config.
            schema: OpportunityBase to support custom fields from caller.

        Returns:
            OpportunitiesListResponse instance. When page is None, the response
            contains all items aggregated from all pages, with pagination_info
            summarizing the aggregated result.

        Raises:
            APIError: If the API request fails
        """
        # Call client method to get paginated response
        paginated_response: Paginated[ItemsT] = self.client.list(  # type: ignore[valid-type]
            self.path, page=page, page_size=page_size
        )

        # Hydrate OpportunityBase models from items dict
        items = [
            schema.model_validate_json(json.dumps(item))  # type: ignore[union-attr]
            for item in paginated_response.items
        ]

        # Convert paginated_response to dict and replace items with hydrated models
        response_data = paginated_response.model_dump(by_alias=True)
        response_data["items"] = items

        # Hydrate OpportunitiesListResponse from response data
        return OpportunitiesListResponse.model_validate(response_data)

    def get(
        self, opp_id: str | UUID, schema: Type[OpportunityBase] | None = OpportunityBase
    ) -> OpportunityBase:
        """Get a specific opportunity by ID.

        Args:
            opp_id: The opportunity ID
            schema: OpportunityBase to support custom fields from caller.

        Returns:
            OpportunityBase instance

        Raises:
            APIError: If the API request fails
        """
        # Call client method to get SuccessResponse
        success_response = self.client.get_item(self.path, opp_id)

        # Hydrate OpportunityBase from response
        response_data = success_response.model_dump(by_alias=True)
        response_data["data"] = schema.from_dict(success_response.data)  # type: ignore[union-attr]

        # Hydrate OpportunityResponse from response data
        opportunity_response = OpportunityResponse.model_validate(response_data)

        # Return the OpportunityBase from the response
        return opportunity_response.data

    def search(
        self,
        search: str,
        status: List[OppStatusOptions] | None = None,
        filters: Mapping[str, Any] | None = None,
        routes: PluginRoutes | None = None,
        page: int | None = None,
        page_size: int | None = None,
        schema: Type[OpportunityBase] | None = OpportunityBase,
    ) -> OpportunitiesSearchResponse:
        """Search for opportunities by a query string, with optional custom filters.

        Args:
            search: The string to search for.
            status: Status shorthand; merged in as the ``status`` filter when given
                (a ``status`` key already in ``filters`` takes precedence).
            filters: Consumer filter dict (standard + custom keys), classified into
                the request body via ``classify_filters``. Registered custom filters
                land in ``customFilters``; register them via ``define_plugin(routes=...)``.
            routes: Route-keyed custom-filter registration (e.g. ``plugin.routes``)
                used to classify which keys are registered custom filters.
            page: Page number (1-indexed). If None, method will fetch all
                items across all pages and aggregate them into a single response.
            page_size: Number of items per page. If None, uses the default from
                client config.
            schema: OpportunityBase to support custom fields added by the caller.

        Returns:
            OpportunitiesSearchResponse with items and pagination info

        Raises:
            APIError: if the API request fails
            FilterError: if a filter is called with an operator its type does not allow
        """
        consumer_filters: dict[str, Any] = dict(filters or {})
        if status is not None and "status" not in consumer_filters:
            consumer_filters["status"] = {"operator": "in", "value": status}

        opp_filters = classify_filters(
            routes or {}, "opportunities", "search", consumer_filters
        )

        request = {
            "filters": opp_filters.model_dump(by_alias=True, exclude_none=True),
            "pagination": {"page": 1, "pageSize": 10},
            "search": search,
            "sorting": {"sortBy": "lastModifiedAt", "sortOrder": "desc"},
        }

        request_data = OpportunitySearchRequest.model_validate(request)

        # Call client method to get paginated response. mode="json" so date filter
        # values serialize to ISO strings — httpx encodes json= with stdlib json,
        # which rejects the datetime.date objects pydantic parses dates into.
        paginated_response: Paginated[ItemsT] = self.client.search(  # type: ignore[valid-type]
            f"{self.path}/search",
            request_data.model_dump(by_alias=True, exclude_unset=True, mode="json"),
            page=page,
            page_size=page_size,
        )

        # Hydrate OpportunityBase models from items dict
        items = [
            schema.model_validate_json(json.dumps(item))  # type: ignore[union-attr]
            for item in paginated_response.items
        ]

        # Convert paginated_response to dict and replace items with hydrated models
        response_data = paginated_response.model_dump(by_alias=True)
        response_data["items"] = items

        response_data["sortInfo"] = {
            "sortBy": "",
            "sortOrder": "",
            "customSortBy": None,
            "errros": [],
        }

        response_data["filterInfo"] = {"filters": {}, "errors": []}

        # Hydrate OpportunitiesListResponse from response data
        return OpportunitiesSearchResponse.model_validate(response_data)
