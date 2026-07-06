"""HTTP client for the CommonGrants API.

``BaseClient`` is the transport plumbing (auth headers, paginated GET/POST). The
generic ``Client`` layers the typed resource facade on top: it binds a plugin's
route filters (``FiltersT``) and Opportunity schema (``ItemT``) so
``client.opportunities.search(filters=...)`` is typed and responses parse with the
plugin's custom fields by default. Construct one directly, or via
``plugin.get_client(...)``.
"""

from __future__ import annotations

import httpx
from typing import Any, Generic, Optional, cast
from uuid import UUID

import typing_extensions as te

from .auth import Auth
from .config import Config
from .response import SuccessResponse
from .exceptions import raise_api_error
from .opportunities import Opportunities
from .pagination import pagination
from .types import ItemsT
from ..extensions.filters import validate_routes
from ..extensions.plugin import PluginSchemas
from ..extensions.types import FiltersT, PluginRoutes, ResourceRoutes
from ..schemas.pydantic.models import OpportunityBase
from ..schemas.pydantic.responses import Filtered, Paginated

# Bound is OpportunityBase[Any] (the custom-fields parameter is invariant, so a
# bare OpportunityBase bound would reject OpportunityBase[OppCustomFields]).
ItemT = te.TypeVar(
    "ItemT", bound="OpportunityBase[Any]", default="OpportunityBase[Any]"
)


def _resolve_opportunity_schema(
    schemas: Optional[PluginSchemas[Any]],
) -> type[OpportunityBase]:
    """The Opportunity model a client parses into by default.

    Reads the common model bound to the plugin's Opportunity schema slot; falls
    back to the base ``OpportunityBase`` when no schemas are bound.
    """
    if schemas is None:
        return OpportunityBase
    common = getattr(getattr(schemas, "Opportunity", None), "common_schema", None)
    return common if isinstance(common, type) else OpportunityBase


class BaseClient:
    """Transport plumbing for the CommonGrants API (auth + paginated GET/POST)."""

    def __init__(
        self,
        config: Optional[Config] = None,
        auth: Optional[Auth] = None,
    ):
        """Initialize the transport layer.

        Args:
            config: Optional Config instance. If None, a default Config is created.
            auth: Optional Auth instance. If None, API key authentication is used
                with the key from config.
        """
        self.config = config or Config()
        self.auth = auth or Auth.api_key(self.config.api_key)
        self.http = httpx.Client(timeout=self.config.timeout)

    def post(self, path: str, **kwargs) -> httpx.Response:
        """Wrapper around ``self.http.post`` that adds auth headers."""
        return self.http.post(
            self.url(path),
            headers=self.auth.get_headers(),
            **kwargs,
        )

    def get(self, path: str, **kwargs) -> httpx.Response:
        """Wrapper around ``self.http.get`` that adds auth headers."""
        return self.http.get(
            self.url(path),
            headers=self.auth.get_headers(),
            **kwargs,
        )

    def get_item(
        self,
        path: str,
        item_id: str | UUID,
    ) -> SuccessResponse:
        """Get a specific item by ID (GET ``{path}/{item_id}``).

        Raises:
            APIError: If the API request fails
        """
        try:
            api_response = self.get(f"{path}/{item_id}")
            api_response.raise_for_status()
            result = SuccessResponse.model_validate(api_response.json())

        except httpx.HTTPError as e:
            raise_api_error(e)

        return result

    @pagination
    def list(
        self,
        path: str,
        page: int | None = None,
        page_size: int | None = None,
        params: dict[str, Any] | None = None,
    ) -> Paginated[ItemsT]:
        """Fetch a set of items via GET, with pagination.

        When page is None, aggregates all pages up to ``config.list_items_limit``.

        Raises:
            APIError: If the API request fails
        """
        page_size = page_size or self.config.page_size
        if page_size < 1:
            page_size = self.config.page_size

        try:
            request_params = {"page": page, "pageSize": page_size}
            if params:
                request_params.update(params)
            api_response = self.get(path, params=request_params)
            api_response.raise_for_status()
            result_dict = Paginated[dict].model_validate(api_response.json())
            result = cast(Paginated[ItemsT], result_dict)

        except httpx.HTTPError as e:
            raise_api_error(e)  # Always raises, never returns

        return result

    @pagination
    def search(
        self,
        path: str,
        request_data: dict[str, Any],
        page: int | None = None,
        page_size: int | None = None,
    ) -> Paginated[ItemsT]:
        """Fetch a set of items via POST, with pagination.

        When page is None, aggregates all pages up to ``config.list_items_limit``.

        Raises:
            APIError: If the API request fails
        """
        page_size = page_size or self.config.page_size
        if page_size < 1:
            page_size = self.config.page_size

        try:
            # request_data already includes any filters assembled by the resource method.
            api_response = self.post(
                path, json=request_data, params={"page": page, "pageSize": page_size}
            )
            api_response.raise_for_status()
            # Validate into Filtered so the server's sortInfo/filterInfo (incl.
            # filterInfo.errors) survive instead of being dropped.
            # Filtered IS-A Paginated, so the existing cast still holds.
            result_dict = Filtered[dict, dict].model_validate(api_response.json())
            result = cast(Paginated[ItemsT], result_dict)

        except httpx.HTTPError as e:
            raise_api_error(e)  # Always raises, never returns

        return result

    def url(self, path: str) -> str:
        """Construct a full URL from base URL and path (trailing slash stripped)."""
        base = self.config.base_url.rstrip("/")
        return f"{base}{path}"

    def close(self):
        """Close the HTTP client and release resources."""
        self.http.close()

    def __enter__(self):
        """Context manager entry; returns the client instance."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit; closes the HTTP client."""
        self.close()


class Client(BaseClient, Generic[FiltersT, ItemT]):
    """Typed resource facade over :class:`BaseClient`.

    Binds a plugin's route filters and Opportunity schema, exposing the typed
    ``opportunities`` resource. Construct one via ``plugin.get_client(...)``: that
    binds the plugin's registered filters (``FiltersT``) and Opportunity schema
    (``ItemT``) so ``opportunities.search`` is typed and responses parse with the
    plugin's custom fields. Constructing ``Client`` directly leaves those generics
    unbound (standard filters only, base ``OpportunityBase`` rows).
    """

    def __init__(
        self,
        config: Optional[Config] = None,
        auth: Optional[Auth] = None,
    ):
        """Initialize the client.

        Args:
            config: Optional Config instance.
            auth: Optional Auth instance.
        """
        super().__init__(config=config, auth=auth)
        self._routes: PluginRoutes[Any] = PluginRoutes(opportunities=ResourceRoutes())
        self._schemas: Optional[PluginSchemas[Any]] = None
        self._opportunity_schema: type[OpportunityBase] = _resolve_opportunity_schema(
            None
        )
        self.opportunities: Opportunities[FiltersT, ItemT] = Opportunities(client=self)

    def _bind_routes(self, routes: PluginRoutes[Any]) -> None:
        """Scope this client to a plugin's registered custom filters.

        Internal hook called by ``plugin.get_client``: it validates the route
        registration and stores it for ``opportunities.search`` to classify
        registered custom filters. Build scoped clients via ``get_client`` rather
        than calling this directly.

        Raises:
            FilterError: If ``routes`` registers a filter whose value type is not a
                filter value model.
        """
        validate_routes(routes)
        self._routes = routes

    def _bind_schemas(self, schemas: Optional[PluginSchemas[Any]]) -> None:
        """Bind a plugin's schema extensions as the default parse schemas.

        Internal hook called by ``plugin.get_client``: the Opportunity common
        model becomes the default schema ``opportunities`` responses parse into.
        Build scoped clients via ``get_client`` rather than calling this directly.
        """
        self._schemas = schemas
        self._opportunity_schema = _resolve_opportunity_schema(schemas)
