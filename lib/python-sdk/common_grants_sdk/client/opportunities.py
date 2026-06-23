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
from ..extensions.types import FilterError
from .types import ItemsT
from typing import List

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
        page: int | None = None,
        page_size: int | None = None,
        schema: Type[OpportunityBase] | None = OpportunityBase,
        filters: dict | None = None,
    ) -> OpportunitiesSearchResponse:
        """Search for opportunties by a query string

        Args:
            search: The string to search for.
            status: List of statuses to search on (shorthand for the ``status``
                default filter).
            page: Page number (1-indexed). If None, method will fetch all
                items across all pages and aggregate them into a single response.
            page_size: Number of items per page. If None, uses the default from
                client config.
            schema: OpportunityBase to support custom fields added by the caller.
            filters: Flat custom-filter dict (``{name: {"operator", "value"}}``,
                e.g. built with the ``f`` helper), classified via
                ``classify_filters``. Registered custom filters validate against
                the specs declared in the client's ``routes`` (bound at construction).

        Returns:
            OpportunitiesSearchResponse with items and pagination info

            Raises:
                APIError: if the API request fails
        """

        # Classify the custom-filter dict. Fail-soft: invalid filters are dropped
        # and their errors collected here rather than raised.
        filters_body: dict = {}
        filter_errors: list[FilterError] = []
        if filters:
            classified = classify_filters(
                self.client.routes or {}, "opportunities", "search", filters
            )
            filter_errors.extend(classified.errors)
            filters_body = classified.result.model_dump(
                by_alias=True, exclude_none=True, mode="json"
            )

        if status:
            if "status" in filters_body:
                # ``status`` given via both the shorthand and ``filters``:
                # ``filters`` wins, the shorthand is ignored, a warning collected.
                filter_errors.append(
                    FilterError(
                        "specified via both the status shorthand and the filters "
                        "argument; used the filters value",
                        path="filters.status",
                        source_value=status,
                    )
                )
            else:
                filters_body["status"] = {"operator": "in", "value": status}

        request: dict = {
            "pagination": {"page": 1, "pageSize": 10},
            "search": search,
            "sorting": {"sortBy": "lastModifiedAt", "sortOrder": "desc"},
        }
        # Only set the filters key when non-empty.
        if filters_body:
            request["filters"] = filters_body

        request_data = OpportunitySearchRequest.model_validate(request)

        # Call client method to get paginated response
        paginated_response: Paginated[ItemsT] = self.client.search(  # type: ignore[valid-type]
            f"{self.path}/search",
            request_data.model_dump(by_alias=True, exclude_unset=True),
            page=page,
            page_size=page_size,
        )

        # Hydrate OpportunityBase models from items dict
        items = [
            schema.model_validate_json(json.dumps(item))  # type: ignore[union-attr]
            for item in paginated_response.items
        ]

        # Replace items with the hydrated models.
        response_data = paginated_response.model_dump(by_alias=True)
        response_data["items"] = items

        # Merge collected client-side errors into filterInfo.errors, flattened to
        # "{path}: {message}" and ordered before any existing entries.
        if filter_errors:
            filter_info = response_data.setdefault("filterInfo", {})
            server_errors = filter_info.get("errors") or []
            filter_info["errors"] = [
                f"{e.path}: {e}" for e in filter_errors
            ] + server_errors

        # Hydrate OpportunitiesSearchResponse from response data
        return OpportunitiesSearchResponse.model_validate(response_data)
