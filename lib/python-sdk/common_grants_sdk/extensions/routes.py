"""Per-route filter registration carriers (static typing only).

A plugin author registers the custom filters a route accepts by declaring a
TypedDict that extends the resource's standard filters, then naming it in
``Routes`` / ``ResourceRoutes``::

    class OppSearchFilters(OpportunityFilters, total=False):
        agency: StringArray

    routes = Routes(opportunities=ResourceRoutes(search=RouteFilters[OppSearchFilters]()))

``RouteFilters[TF]`` is a phantom carrier: it holds no runtime data, it only
carries the TypedDict type so the plugin can project it onto the registered
search-filters slot (``plugin.search_filters_type()``). These are frozen,
covariant dataclasses so that projection can recover the per-method filter type
via a ``self`` annotation, the same pattern as the schema slots. The throw-based
runtime classifier (``classify_filters`` / ``validate_routes``) does not need
them.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Generic, TypeVar, cast

import typing_extensions as te

from ..schemas.pydantic.filters.opportunity import OpportunityFilters

TF = TypeVar("TF")


class RouteFilters(Generic[TF]):
    """Phantom carrier of a route method's filters TypedDict type (static typing only)."""


_S = te.TypeVar("_S", covariant=True, default="RouteFilters[Any]")


@dataclass(frozen=True)
class ResourceRoutes(Generic[_S]):
    """A resource's filterable methods. One slot per method (``search`` to start)."""

    # The slot is covariant so a plugin holding a concrete RouteFilters is usable
    # where the base is expected — what the constrained-``self`` projection relies
    # on. Covariance is sound here (frozen, read-only). mypy forbids a covariant
    # TypeVar as a parameter (dataclass fields become ``__init__`` params); pyright
    # accepts it. The ignore keeps both checkers green.
    search: _S = field(default_factory=lambda: cast("Any", RouteFilters()))  # type: ignore[misc]


_ROpportunity = te.TypeVar(
    "_ROpportunity",
    covariant=True,
    default="ResourceRoutes[RouteFilters[OpportunityFilters]]",
)


@dataclass(frozen=True)
class Routes(Generic[_ROpportunity]):
    """Per-resource route registration. Omitted resources default to standard filters."""

    # Covariant slot; see the note on ``ResourceRoutes.search`` for why the
    # ``type: ignore[misc]`` is needed for mypy but not pyright.
    opportunities: _ROpportunity = field(default_factory=lambda: cast("Any", ResourceRoutes()))  # type: ignore[misc]  # noqa: E501
