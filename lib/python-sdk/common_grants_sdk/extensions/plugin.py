"""Plugin assembly: ``PluginSchemas``, ``Plugin``, and ``define_plugin``.

A plugin maps the schema extensions an author builds with ``schema(...)`` onto the
registered extensible schemas, keyed by registry name, and (optionally) registers
per-route custom filters via ``routes``. Schemas a plugin does not extend fall back
to the base schema (a ``SchemaOnly``), never ``None``; routes a plugin does not
register fall back to the resource's standard filters. So consumers get fully-typed,
non-optional dot access: ``plugin.schemas.Opportunity`` and a typed projection of the
registered search filters via ``plugin.search_filters_type()``.

``PluginSchemas``, ``Plugin``, and the route carriers are frozen dataclasses with
covariant type parameters (read-only, so covariance is sound). That covariance lets
``search_filters_type`` recover the route's registered filter TypedDict via a single
``self`` annotation, with no call-site type arguments. The transport layer is
out-of-scope (ADR-0022): ``search_filters_type`` returns the *type* of the registered
filter bag — the typed slot a downstream client facade would consume — rather than a
client instance.
"""

from __future__ import annotations

from dataclasses import dataclass, field, fields
from typing import Any, Generic, TypeVar, cast

import typing_extensions as te

from ..schemas.pydantic.models import OpportunityBase
from .routes import TF, ResourceRoutes, RouteFilters, Routes
from .schema import (
    PluginDefinitionError,
    SchemaOnly,
    SchemaWithTransforms,
    schema,
)
from .types import PluginMeta

SchemasT = TypeVar("SchemasT")

# The fallback for a schema a plugin does not extend: the base schema, no custom
# fields, no transforms. A SchemaOnly type, so unextended slots have no
# to_common either.
DefaultOpportunity = SchemaOnly[OpportunityBase]

_TOpportunity = te.TypeVar("_TOpportunity", default=DefaultOpportunity)

# ``TF`` (the registered filters TypedDict) is imported from ``routes`` and
# recovered by the constrained-``self`` projection on ``search_filters_type``.

# The routes carrier type the plugin holds. Defaults to the standard-filters
# carrier so an author who omits ``routes`` still gets a concrete, non-optional
# ``plugin.routes`` and a standard-filters projection.
_RDefault = ResourceRoutes[RouteFilters[Any]]
_RoutesT = te.TypeVar("_RoutesT", default="Routes[_RDefault]")


@dataclass
class PluginSchemas(Generic[_TOpportunity]):
    """Maps your extensions to the extensible schemas. Construct it directly.

    Pass one extension per schema you extend, keyed by the registered schema name.
    Schemas you omit fall back to the base schema (a ``SchemaOnly``), never
    ``None``. Unknown schema names are a *static* error, and each slot's type is
    inferred concretely, so consumers get non-optional dot access::

        plugin = define_plugin(PluginSchemas(Opportunity=opp_ext), meta=...)
        plugin.schemas.Opportunity   # the extension you passed

    There is one field per registered extensible schema.
    """

    Opportunity: _TOpportunity = field(
        default_factory=lambda: cast(
            _TOpportunity, schema(common_schema=OpportunityBase)
        )
    )


@dataclass(frozen=True)
class Plugin(Generic[SchemasT, _RoutesT]):
    """The plugin singleton consumers import.

    ``schemas`` and ``routes`` are typed frozen dataclasses, so
    ``plugin.schemas.Opportunity`` is fully typed (dot access) and
    ``plugin.search_filters_type()`` recovers the registered search-filters
    TypedDict — autocompleting the registered filter keys with no call-site type
    args.
    """

    schemas: SchemasT
    routes: _RoutesT
    meta: PluginMeta

    def search_filters_type(
        self: Plugin[Any, Routes[ResourceRoutes[RouteFilters[TF]]]],
    ) -> type[TF]:
        """Return the registered opportunities-search filters TypedDict type.

        This is the typed narrowing slot. ``TF`` is recovered from the route
        registration via the ``self`` annotation, so a consumer gets the exact
        ``OpportunityFilters`` subclass the author registered (or the base
        ``OpportunityFilters`` when no route was registered) with no call-site
        type arguments::

            FiltersT = plugin.search_filters_type()
            filters: FiltersT = {"agency": f.in_(["NSF"])}  # per-key narrowed

        The transport layer is out-of-scope (ADR-0022), so this returns the
        filter *type* rather than a client; a downstream client facade would
        consume this slot as ``search(filters: TF)``.
        """
        return cast("type[TF]", dict)


def define_plugin(
    schemas: SchemasT,
    *,
    # Shared module-level default: one frozen, data-less carrier reused across
    # calls (the standard-filters projection). Frozen + data-less, so reuse is safe.
    routes: _RoutesT = cast("Any", Routes()),
    meta: PluginMeta,
) -> Plugin[SchemasT, _RoutesT]:
    """Assemble the plugin from schema extensions, optional route registrations,
    and metadata.

    Each schema attribute name must equal the entry's ``schema_name``, so
    ``schemas.Opportunity`` really holds the Opportunity extensible schema.

    ``routes`` is a typed :class:`Routes` carrier (static-typing only); it is
    threaded onto the returned plugin so ``search_filters_type`` can recover the
    registered filter TypedDict. Omitted, it defaults to the resource's standard
    filters.

    Raises:
        PluginDefinitionError: If any slot does not hold a schema extension, or holds
            one whose ``schema_name`` does not match its attribute name.
    """
    errors: list[str] = []
    for fld in fields(cast(Any, schemas)):
        entry = getattr(schemas, fld.name)
        if not isinstance(entry, (SchemaWithTransforms, SchemaOnly)):
            errors.append(f"schemas.{fld.name}: not a schema extension")
        elif entry.schema_name != fld.name:
            errors.append(
                f"schemas.{fld.name}: holds the {entry.schema_name!r} extensible "
                f"schema; the attribute name must match the schema name"
            )
    if errors:
        raise PluginDefinitionError("plugin", errors)
    return Plugin(schemas=schemas, routes=routes, meta=meta)
