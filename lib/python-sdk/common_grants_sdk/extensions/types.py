"""Plugin framework types for the CommonGrants Python SDK."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, Field

from .specs import CustomFieldSpec

TNative = TypeVar("TNative")
TCommon = TypeVar("TCommon")
T = TypeVar("T")

# Capability enum — Literal rather than StrEnum to stay JSON-safe.
PluginCapability = Literal["customFields", "customFilters", "transforms", "client"]

# Type aliases
Handler = Callable[[Any, Any], Any]
ClientConfig = dict[str, Any]


class PluginError(Exception):
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
    errors: aggregated PluginErrors; empty on full success.

    Consumers apply their own strict-vs-lenient rule for what counts as success:
    - Strict: treat any non-empty errors as failure.
    - Lenient: use result despite warnings; inspect errors for context.
    """

    result: T
    errors: list[PluginError]


class ObjectMappings(BaseModel):
    """ADR-0017 mapping dicts for a single object, stored in the serializable extensions config.

    Each direction is author-provided — build_transforms() does not invert one into
    the other because many-to-one handlers like switch are not reversible (Decision #6).
    """

    model_config = ConfigDict(populate_by_name=True)

    to_common: dict[str, Any] | None = Field(default=None, alias="toCommon")
    from_common: dict[str, Any] | None = Field(default=None, alias="fromCommon")


class PluginExtensionsMeta(BaseModel):
    """Plugin identity and capability declaration. All fields are optional."""

    model_config = ConfigDict(populate_by_name=True)

    name: str | None = None
    version: str | None = None
    source_system: str | None = Field(default=None, alias="sourceSystem")
    capabilities: list[PluginCapability] | None = None


class PluginExtensionsSchema(BaseModel):
    """Per-object config inside extensions.schemas.

    custom_fields: custom field declarations (merged by merge_extensions).
    mappings: optional ADR-0017 declarative mappings. When present and no explicit
        to_common / from_common is supplied in schemas[obj], define_plugin() will
        auto-invoke build_transforms() on these (TODO — ADR-0022 Decision #6).
    """

    model_config = ConfigDict(populate_by_name=True)

    custom_fields: dict[str, CustomFieldSpec] | None = Field(
        default=None, alias="customFields"
    )
    mappings: ObjectMappings | None = None


class PluginExtensions(BaseModel):
    """Serializable portion of plugin config — safe to store as JSON.

    Used by merge_extensions() to combine declarations from multiple plugin packages.
    """

    model_config = ConfigDict(populate_by_name=True)

    meta: PluginExtensionsMeta | None = None
    schemas: dict[str, PluginExtensionsSchema] | None = None


@dataclass
class ObjectSchemasInput(Generic[TNative, TCommon]):
    """Input type provided by plugin authors inside define_plugin(schemas=...).

    Plugin authors supply to_common and from_common as plain callables — either
    hand-written or generated via build_transforms(). native defaults to
    dict[str, Any] if omitted.

    common is intentionally absent here. It is injected by define_plugin() during
    compilation from ObjectSchemasInput → ObjectSchemas, resolved from the generated
    model classes produced by the code generator. Plugin authors never set it directly —
    cg_config.py cannot import from generated/ (it is the input to generation).
    """

    native: type[TNative] | None = None
    to_common: Callable[[TNative], TransformResult[TCommon]] | None = None
    from_common: Callable[[TCommon], TransformResult[TNative]] | None = None


@dataclass
class ObjectSchemas(Generic[TNative, TCommon]):
    """Runtime compiled type produced by define_plugin() — not provided directly by authors.

    In the PoC, define_plugin() stores ObjectSchemasInput as-is; full compilation
    (adding common from the base CG model, wrapping with model_validate) is a TODO
    for the real SDK (ADR-0022 Decision #7).
    """

    native: type[TNative]
    common: type[TCommon]
    to_common: Callable[[TNative], TransformResult[TCommon]]
    from_common: Callable[[TCommon], TransformResult[TNative]]
