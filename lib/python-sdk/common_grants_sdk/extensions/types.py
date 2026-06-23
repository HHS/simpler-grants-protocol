"""Plugin framework types for the CommonGrants Python SDK."""

from __future__ import annotations

from dataclasses import dataclass
from typing import (
    TYPE_CHECKING,
    Any,
    Callable,
    Generic,
    Literal,
    NotRequired,
    TypedDict,
    TypeVar,
)

from pydantic import BaseModel, ConfigDict, Field

from .specs import CustomFilterSpec

if TYPE_CHECKING:
    from common_grants_sdk.schemas.pydantic.filters.opportunity import OppFilters

T = TypeVar("T")

# Capability enum — Literal rather than StrEnum to stay JSON-safe.
PluginCapability = Literal["customFields", "customFilters", "transforms"]

# Type aliases
Handler = Callable[[Any, Any], Any]

# Route-keyed custom-filter declaration types:
# PluginRoutes = {resourceName: {methodName: RouteDeclarations}}.
RouteMethodFilters = dict[str, CustomFilterSpec]  # {filterName: spec}


class RouteDeclarations(TypedDict):
    """Filter declarations for a single route method (e.g. ``search``).

    ``filters`` maps filter name → ``CustomFilterSpec`` and is optional: a
    method may appear in the route map with no declarations.
    """

    filters: NotRequired[RouteMethodFilters]


PluginRoutes = dict[
    str, dict[str, RouteDeclarations]
]  # {resource: {method: declarations}}


class PassthroughModel(BaseModel):
    """Permissive source schema, which preserves the transformation result dict as is.

    Validates only that the input is a mapping and preserves arbitrary keys
    (``extra="allow"``) without constraining any field. Use it as the
    ``source_schema`` on a transform entry to satisfy the source-schema
    requirement without modeling the source-system shape (e.g. in tests or
    early development).
    """

    model_config = ConfigDict(extra="allow")


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


class FilterError(Exception):
    """Structured error raised by custom-filter validation.

    Raised by validate_routes (registration time) and validate_filter_call /
    classify_filters (call time). Carries field path, handler name, source
    value, and underlying cause so consumers can reason about failures
    programmatically without parsing error text.

    Note: source_value may contain PII. Adopters are responsible for redacting
    it before logging or re-raising. The SDK does not redact by default.
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
class ClassifyResult:
    """Fail-soft return shape for ``classify_filters``.

    ``classify_filters`` never raises on a bad call-time filter value: each
    failing key is dropped from ``result`` and its :class:`FilterError` collected
    into ``errors``.

    result: classified filters, containing only the keys that passed validation.
    errors: aggregated ``FilterError``s for keys that failed; empty on success.

    Registration-time validation (``validate_routes``) still raises — a malformed
    plugin declaration has no result to return.
    """

    result: "OppFilters"
    errors: list[FilterError]


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


class PluginMeta(BaseModel):
    """Plugin identity and capability declaration.

    name and source_system are required so that plugin registries and
    dependency-injection surfaces always have a reliable display label and
    provenance string. version and capabilities remain optional because
    they can be inferred or omitted during early development.
    """

    model_config = ConfigDict(populate_by_name=True)

    name: str
    source_system: str = Field(
        validation_alias="sourceSystem", serialization_alias="sourceSystem"
    )
    version: str | None = None
    capabilities: list[PluginCapability] | None = None
