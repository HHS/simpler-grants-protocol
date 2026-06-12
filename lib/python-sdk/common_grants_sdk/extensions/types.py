"""Plugin framework types for the CommonGrants Python SDK."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, Field

from .specs import CustomFieldSpec

TSource = TypeVar("TSource")
TCommon = TypeVar("TCommon")
T = TypeVar("T")

# Capability enum — Literal rather than StrEnum to stay JSON-safe.
PluginCapability = Literal["customFields", "customFilters", "transforms"]

# Type aliases
Handler = Callable[[Any, Any], Any]


class TransformError(Exception):
    """Structured transformation error per ADR-0022 Decision #9.

    Carries field path, handler name, source value, and underlying cause so
    consumers can reason about failures programmatically without parsing error text.

    Note: source_value may contain PII when transforming applicant data.
    Adopters are responsible for redacting it before logging or re-raising.
    The SDK does not redact by default.
    """

    def __init__(
        self,
        message: str,
        *,
        path: str | None = None,
        handler: str | None = None,
        source_value: Any = None,
        cause: BaseException | None = None,
    ) -> None:
        super().__init__(message)
        self.path = path
        self.handler = handler
        self.source_value = source_value
        self.cause = cause


@dataclass
class TransformResult(Generic[T]):
    """Unconditional return shape for to_common / from_common (ADR-0022 Decision #7).

    result: the transformed value (may be partial on error).
    errors: aggregated TransformErrors; empty on full success.

    Consumers apply their own strict-vs-lenient rule for what counts as success:
    - Strict: treat any non-empty errors as failure.
    - Lenient: use result despite warnings; inspect errors for context.
    """

    result: T
    errors: list[TransformError]


class SchemaMappings(BaseModel):
    """ADR-0017 declarative mapping dicts for a single object.

    Each direction is author-provided — build_transforms() does not invert one into
    the other because many-to-one handlers like switch are not reversible (Decision #6).
    """

    model_config = ConfigDict(populate_by_name=True)

    to_common: dict[str, Any] | None = Field(default=None, alias="toCommon")
    from_common: dict[str, Any] | None = Field(default=None, alias="fromCommon")


class PluginExtensionsMeta(BaseModel):
    """Plugin identity and capability declaration.

    name and source_system are required so that plugin registries and
    dependency-injection surfaces always have a reliable display label and
    provenance string. version and capabilities remain optional because
    they can be inferred or omitted during early development.
    """

    model_config = ConfigDict(populate_by_name=True)

    name: str
    source_system: str = Field(alias="sourceSystem")
    version: str | None = None
    capabilities: list[PluginCapability] | None = None


@dataclass
class SchemaInput(Generic[TSource, TCommon]):
    """Input type provided by plugin authors inside define_plugin(schemas=...).

    This is the single surface for all per-object declarations. Plugin authors supply
    to_common and from_common as plain callables — either hand-written or generated
    via build_transforms(). source_schema defaults to dict[str, Any] if omitted.

    custom_fields declares any extra fields this object exposes beyond the base
    CommonGrants schema. The code generator reads these and emits typed subclasses.

    mappings holds optional declarative mappings. When present and no
    explicit to_common / from_common is supplied, the code generator auto-invokes
    build_transforms() on these. Explicit callables take priority and disable
    auto-wiring for that object.

    common_schema is intentionally absent here. It is injected by define_plugin() during
    compilation from SchemaInput → SchemaConfig, resolved from the generated
    model classes produced by the code generator. Plugin authors never set it directly —
    cg_config.py cannot import from generated/ (it is the input to generation).
    """

    source_schema: type[TSource] | None = None
    custom_fields: dict[str, CustomFieldSpec] | None = None
    mappings: SchemaMappings | None = None
    to_common: Callable[[TSource], TransformResult[TCommon]] | None = None
    from_common: Callable[[TCommon], TransformResult[TSource]] | None = None


@dataclass
class SchemaConfig(Generic[TSource, TCommon]):
    """Runtime compiled schema container for a single object (ADR-0022).

    Bundles the type information and transform callables for one schema object
    (e.g. Opportunity). Accessed via attribute lookup on the plugin's schemas
    container: plugin.schemas.Opportunity.

    source_schema: The source system's Python type (defaults to dict when not specified).
    common_schema: The CommonGrants-format Pydantic model class produced by the generator.
                   If the plugin declares custom_fields, this is a generated subclass of
                   the base CG model (e.g. OpportunityBase) with those fields already
                   baked in as typed attributes.
    to_common:     Transforms source_data → TransformResult[common_schema] (None if not configured).
    from_common:   Transforms common_data → TransformResult[source_schema] (None if not configured).
    """

    source_schema: type[TSource]
    common_schema: type[TCommon]
    to_common: Callable[[TSource], TransformResult[TCommon]] | None = None
    from_common: Callable[[TCommon], TransformResult[TSource]] | None = None
