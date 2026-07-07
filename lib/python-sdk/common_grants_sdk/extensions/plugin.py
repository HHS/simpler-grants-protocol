"""Plugin assembly: ``PluginSchemas``, ``Plugin``, and ``define_plugin``.

A plugin maps the schema extensions an author builds with ``schema(...)`` onto the
registered extensible schemas, keyed by registry name, and (optionally) registers
per-route custom filters via ``routes`` (a ``PluginRoutes`` carrier). Schemas a plugin
does not extend fall back to the base schema (a ``SchemaOnly``), never ``None``, so
consumers get fully-typed, non-optional dot access: ``plugin.schemas.Opportunity``.

``plugin.get_client(...)`` returns a client already scoped with the plugin's routes and
schemas: ``client.opportunities.search(filters=...)`` is typed by the registered filter
TypedDict, and responses parse with the plugin's Opportunity schema by default.
"""

from __future__ import annotations

from dataclasses import dataclass, field, fields
from typing import TYPE_CHECKING, Any, Generic, Optional, cast, overload

import typing_extensions as te

from ..schemas.pydantic.models import OpportunityBase
from .schema import (
    PluginDefinitionError,
    SchemaOnly,
    SchemaWithTransforms,
    schema,
)
from .types import FiltersT, PluginMeta, PluginRoutes, ResourceRoutes

if TYPE_CHECKING:
    from ..client.auth import Auth
    from ..client.client import Client
    from ..client.config import Config

SchemasT = te.TypeVar("SchemasT")

# The item model a get_client()-scoped client parses responses into: the common
# model bound to the plugin's Opportunity schema slot (OpportunityBase or a
# custom-fields parametrization), defaulting to the base when unextended.
# Bound is OpportunityBase[Any] (not OpportunityBase) because the custom-fields
# type parameter is invariant — a bare OpportunityBase bound would reject
# OpportunityBase[OppCustomFields].
ItemT = te.TypeVar(
    "ItemT", bound="OpportunityBase[Any]", default="OpportunityBase[Any]"
)

# The fallback for a schema a plugin does not extend: the base schema, no custom
# fields, no transforms. A SchemaOnly type, so unextended slots have no
# to_common either.
DefaultOpportunity = SchemaOnly[OpportunityBase]

_TOpportunity = te.TypeVar("_TOpportunity", default=DefaultOpportunity)


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
class Plugin(Generic[SchemasT, FiltersT]):
    """The plugin singleton consumers import.

    ``schemas`` is a typed frozen dataclass, so ``plugin.schemas.Opportunity`` is
    fully typed (dot access). ``routes`` is the typed custom-filter registration
    (``PluginRoutes``); its filter TypedDict flows through ``get_client`` to type
    ``client.opportunities.search(filters=...)``.
    """

    schemas: SchemasT
    routes: PluginRoutes[FiltersT]
    meta: PluginMeta

    @overload
    def get_client(
        self: "Plugin[PluginSchemas[SchemaOnly[ItemT]], FiltersT]",
        config: Optional[Config] = ...,
        auth: Optional[Auth] = ...,
    ) -> "Client[FiltersT, ItemT]": ...

    @overload
    def get_client(
        self: "Plugin[PluginSchemas[SchemaWithTransforms[Any, ItemT]], FiltersT]",
        config: Optional[Config] = ...,
        auth: Optional[Auth] = ...,
    ) -> "Client[FiltersT, ItemT]": ...

    def get_client(
        self,
        config: "Optional[Config]" = None,
        auth: "Optional[Auth]" = None,
    ) -> "Client[Any, Any]":
        """Return a client pre-scoped with this plugin's routes and schemas.

        Consumers call ``plugin.get_client(config)`` instead of constructing a
        client and binding the plugin's schemas/routes by hand. The returned
        client types ``opportunities.search(filters=...)`` by the plugin's
        registered filters and parses responses with its Opportunity schema.
        """
        # Local import: the client imports from extensions, so importing it at
        # module scope here would create a cycle.
        from ..client.client import Client

        # self.schemas/self.routes are opaque here (SchemasT); the overloads above
        # carry the precise Client[FiltersT, ItemT] the caller sees.
        client = Client(config=config, auth=auth)
        client._bind_schemas(cast("Any", self.schemas))
        client._bind_routes(cast("Any", self.routes))
        return client


def define_plugin(
    schemas: SchemasT,
    *,
    routes: PluginRoutes[FiltersT] | None = None,
    meta: PluginMeta,
) -> Plugin[SchemasT, FiltersT]:
    """Assemble the plugin from schema extensions, optional route registrations,
    and metadata.

    Each schema attribute name must equal the entry's ``schema_name``, so
    ``schemas.Opportunity`` really holds the Opportunity extensible schema.

    ``routes`` is the typed custom-filter registration (``PluginRoutes``), threaded
    onto the returned plugin so ``plugin.get_client()`` can classify and type custom
    filters. Omitted, it defaults to a carrier with no registered filters.

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
    resolved_routes: PluginRoutes[Any] = (
        routes if routes is not None else PluginRoutes(opportunities=ResourceRoutes())
    )
    return Plugin(schemas=schemas, routes=resolved_routes, meta=meta)
