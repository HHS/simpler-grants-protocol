"""Pure-runtime filter engine for the CommonGrants Python SDK.

Provides:
- ``f.*`` helper module for building DefaultFilter instances.
- ``FILTER_TYPE_SCHEMAS`` — map from CustomFilterType to the Pydantic validation model.
- ``DEFAULT_FILTER_NAMES`` — frozenset of all core default-filter field names (snake + alias).
- ``validate_routes(routes)`` — registration-time validator; raises PluginError.
- ``validate_filter_call(spec, filter_name, value)`` — call-time validator; raises PluginError.
- ``classify_filters(routes, resource, method, consumer_filters)`` — three-bucket ADR-0012
  classifier that returns an OppFilters wire body.

No generate.py / codegen dependency. Correctness is enforced at runtime by Pydantic v2;
there is no compile-time key/value narrowing claim (Python has no equivalent of the TS
SDK's ``as const`` literal narrowing).
"""

from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, ValidationError

from common_grants_sdk.schemas.pydantic.filters.base import (
    ArrayOperator,
    ComparisonOperator,
    DefaultFilter,
    EquivalenceOperator,
    RangeOperator,
    StringOperator,
)
from common_grants_sdk.schemas.pydantic.filters.boolean import BooleanComparisonFilter
from common_grants_sdk.schemas.pydantic.filters.date import (
    DateComparisonFilter,
    DateRangeFilter,
)
from common_grants_sdk.schemas.pydantic.filters.money import (
    MoneyComparisonFilter,
    MoneyRangeFilter,
)
from common_grants_sdk.schemas.pydantic.filters.numeric import (
    NumberArrayFilter,
    NumberComparisonFilter,
    NumberRangeFilter,
)
from common_grants_sdk.schemas.pydantic.filters.opportunity import (
    OppDefaultFilters,
    OppFilters,
)
from common_grants_sdk.schemas.pydantic.filters.string import (
    StringArrayFilter,
    StringComparisonFilter,
)

from .specs import CustomFilterSpec, CustomFilterType
from .types import PluginError, PluginRoutes

# ---------------------------------------------------------------------------
# f.* helpers
# ---------------------------------------------------------------------------


class _FHelpers:
    """Helper namespace mirroring the TS ``F`` object.

    Import as ``from common_grants_sdk.extensions import f`` and use as
    ``f.eq("open")``, ``f.in_([...])``, etc.

    ``in_`` and ``not_in`` use the reserved-word workaround:
    the Python methods are ``f.in_`` / ``f.not_in`` while the wire operator
    values are ``"in"`` / ``"notIn"`` (matching the TS SDK's ``F.in`` / ``F.notIn``).
    """

    def eq(self, value: Any) -> DefaultFilter:
        """Return DefaultFilter(operator="eq", value=value)."""
        return DefaultFilter(operator=EquivalenceOperator.EQUAL, value=value)

    def neq(self, value: Any) -> DefaultFilter:
        """Return DefaultFilter(operator="neq", value=value)."""
        return DefaultFilter(operator=EquivalenceOperator.NOT_EQUAL, value=value)

    def gt(self, value: Any) -> DefaultFilter:
        """Return DefaultFilter(operator="gt", value=value)."""
        return DefaultFilter(operator=ComparisonOperator.GREATER_THAN, value=value)

    def gte(self, value: Any) -> DefaultFilter:
        """Return DefaultFilter(operator="gte", value=value)."""
        return DefaultFilter(
            operator=ComparisonOperator.GREATER_THAN_OR_EQUAL, value=value
        )

    def lt(self, value: Any) -> DefaultFilter:
        """Return DefaultFilter(operator="lt", value=value)."""
        return DefaultFilter(operator=ComparisonOperator.LESS_THAN, value=value)

    def lte(self, value: Any) -> DefaultFilter:
        """Return DefaultFilter(operator="lte", value=value)."""
        return DefaultFilter(
            operator=ComparisonOperator.LESS_THAN_OR_EQUAL, value=value
        )

    def in_(self, value: list[Any]) -> DefaultFilter:
        """Return DefaultFilter with wire operator "in" (Python keyword workaround: f.in_)."""
        return DefaultFilter(operator=ArrayOperator.IN, value=value)

    def not_in(self, value: list[Any]) -> DefaultFilter:
        """Return DefaultFilter with wire operator "notIn" (Python f.not_in vs TS F.notIn)."""
        return DefaultFilter(operator=ArrayOperator.NOT_IN, value=value)

    def like(self, value: str) -> DefaultFilter:
        """Return DefaultFilter(operator="like", value=value)."""
        return DefaultFilter(operator=StringOperator.LIKE, value=value)

    def not_like(self, value: str) -> DefaultFilter:
        """Return DefaultFilter(operator="notLike", value=value)."""
        return DefaultFilter(operator=StringOperator.NOT_LIKE, value=value)

    def between(self, min: Any, max: Any) -> DefaultFilter:
        """Return DefaultFilter(operator="between", value={"min": min, "max": max})."""
        return DefaultFilter(
            operator=RangeOperator.BETWEEN, value={"min": min, "max": max}
        )

    def outside(self, min: Any, max: Any) -> DefaultFilter:
        """Return DefaultFilter(operator="outside", value={"min": min, "max": max})."""
        return DefaultFilter(
            operator=RangeOperator.OUTSIDE, value={"min": min, "max": max}
        )


#: Module-level singleton — use as ``f.eq(...)``, ``f.in_([...])``, etc.
f = _FHelpers()

# ---------------------------------------------------------------------------
# FILTER_TYPE_SCHEMAS — call-time validation map
# ---------------------------------------------------------------------------

#: Maps each CustomFilterType to the Pydantic model used to validate operator/value shape.
#: ``integerComparison`` reuses ``NumberComparisonFilter`` — a dedicated integer schema
#: with int-only validation is deferred (mirrors the TS SDK, where
#: ``integerComparison`` reuses ``NumberComparisonFilterSchema``).
#: ``booleanComparison`` uses the SDK-level ``BooleanComparisonFilter``.
FILTER_TYPE_SCHEMAS: dict[CustomFilterType, type[BaseModel]] = {
    CustomFilterType.STRING_COMPARISON: StringComparisonFilter,
    CustomFilterType.STRING_ARRAY: StringArrayFilter,
    CustomFilterType.NUMBER_COMPARISON: NumberComparisonFilter,
    CustomFilterType.NUMBER_ARRAY: NumberArrayFilter,
    CustomFilterType.NUMBER_RANGE: NumberRangeFilter,
    CustomFilterType.INTEGER_COMPARISON: NumberComparisonFilter,  # reuse — see note above
    CustomFilterType.BOOLEAN_COMPARISON: BooleanComparisonFilter,
    CustomFilterType.DATE_COMPARISON: DateComparisonFilter,
    CustomFilterType.DATE_RANGE: DateRangeFilter,
    CustomFilterType.MONEY_COMPARISON: MoneyComparisonFilter,
    CustomFilterType.MONEY_RANGE: MoneyRangeFilter,
}

# ---------------------------------------------------------------------------
# DEFAULT_FILTER_NAMES — must include BOTH snake_case field names AND camelCase aliases
# ---------------------------------------------------------------------------

#: All core default-filter names from OppDefaultFilters: snake_case field names PLUS their
#: camelCase ``alias`` values.  Both forms are needed so that ``validate_routes`` can catch
#: a plugin author registering a custom filter whose name shadows either form.
DEFAULT_FILTER_NAMES: frozenset[str] = frozenset(
    list(OppDefaultFilters.model_fields.keys())
    + [v.alias for v in OppDefaultFilters.model_fields.values() if v.alias]
)

# ---------------------------------------------------------------------------
# Alias-normalization maps for classify_filters
#
# OppDefaultFilters uses snake_case field names with camelCase aliases but does NOT
# set populate_by_name=True.  Pydantic v2 therefore requires the alias form when
# constructing OppFilters via **kwargs — passing the snake_case field name silently
# results in None (the alias is the required construction key).
#
# classify_filters normalizes consumer keys to the alias (or field-name for fields
# without an alias) before passing them to OppFilters(**...):
#   - snake_case keys with a camelCase alias → converted to the alias (closeDateRange)
#   - camelCase alias keys → kept as-is (already the alias)
#   - keys with no alias (e.g. "status") → kept as-is (snake == wire key)
# ---------------------------------------------------------------------------

# Map from camelCase alias → snake_case field name (used for DEFAULT_FILTER_NAMES check).
_ALIAS_TO_SNAKE: dict[str, str] = {
    field_info.alias: field_name
    for field_name, field_info in OppDefaultFilters.model_fields.items()
    if field_info.alias
}

# Map from snake_case field name → camelCase alias (used for OppFilters construction).
# Only fields that declare an alias are included; fields without aliases use their
# snake_case name directly as the OppFilters constructor key (no alias needed).
_SNAKE_TO_ALIAS: dict[str, str] = {
    field_name: field_info.alias
    for field_name, field_info in OppDefaultFilters.model_fields.items()
    if field_info.alias
}

# ---------------------------------------------------------------------------
# validate_routes — registration-time validator
# ---------------------------------------------------------------------------


def validate_routes(routes: PluginRoutes) -> None:  # noqa: C901
    """Registration-time validator for a plugin's route filter declarations.

    Iterates every filter spec in ``routes`` and raises ``PluginError`` on:
    1. Unknown ``filter_type`` (not in ``FILTER_TYPE_SCHEMAS``).
    2. Filter name that collides with a core default-filter name in
       ``DEFAULT_FILTER_NAMES`` (the escape-hatch collision check — core-shadowing
       names must use the ``gov.<system>@<filterName>`` namespace instead).

    The ``seen`` guard below is a defensive forward-looking comment only:
    a Python ``dict[str, CustomFilterSpec]`` literal cannot hold duplicate keys,
    so iterating ``.items()`` yields each key exactly once.  The guard is retained
    for a future list-of-pairs API and will never fire with current dict semantics.

    Args:
        routes: Route-keyed filter declarations as ``PluginRoutes``.

    Raises:
        PluginError: On the first invalid declaration found.
    """
    for resource, methods in routes.items():
        for method, filter_specs in methods.items():
            seen: set[str] = (
                set()
            )  # unreachable with dict semantics; retained for a future list-of-pairs API
            for filter_name, spec in filter_specs.items():
                path = f"routes.{resource}.{method}.{filter_name}"
                if spec.filter_type not in FILTER_TYPE_SCHEMAS:
                    raise PluginError(
                        f'Unknown filter_type "{spec.filter_type}" for filter "{filter_name}"',
                        path=path,
                        source_value=spec,
                    )
                if filter_name in DEFAULT_FILTER_NAMES:
                    raise PluginError(
                        f'Filter name "{filter_name}" collides with a default filter name',
                        path=path,
                        source_value=filter_name,
                    )
                if (
                    filter_name in seen
                ):  # forward-looking guard; unreachable with dict semantics
                    raise PluginError(
                        f'Duplicate filter name "{filter_name}" in {resource}.{method}',
                        path=path,
                        source_value=filter_name,
                    )
                seen.add(filter_name)


# ---------------------------------------------------------------------------
# validate_filter_call — call-time validator
# ---------------------------------------------------------------------------


def validate_filter_call(
    spec: Optional[CustomFilterSpec],
    filter_name: str,
    value: Any,
) -> None:
    """Call-time validator for a single filter value.

    Validates ``value`` against the Pydantic model for ``spec.filter_type`` when
    ``spec`` is provided (registered filter), or against ``DefaultFilter`` when
    ``spec`` is ``None`` (ad-hoc / escape-hatch filter).

    Correctness is enforced at runtime by Pydantic v2; no compile-time key/value
    narrowing is claimed (Python has no equivalent of TS ``as const`` narrowing).

    Args:
        spec: The registered ``CustomFilterSpec`` for this filter, or ``None`` for ad-hoc.
        filter_name: The filter name (used in PluginError path).
        value: The filter value to validate (typically a ``DefaultFilter`` instance).

    Raises:
        PluginError: On operator/value-shape mismatch, wrapping the pydantic
            ``ValidationError`` as ``cause``.
    """
    if spec is not None:
        model_cls = FILTER_TYPE_SCHEMAS[spec.filter_type]
        try:
            if isinstance(value, BaseModel):
                model_cls.model_validate(value.model_dump())
            else:
                model_cls.model_validate(value)
        except ValidationError as exc:
            raise PluginError(
                f'Filter "{filter_name}" failed validation: {exc.error_count()} error(s)',
                path=filter_name,
                source_value=value,
                cause=exc,
            ) from exc
    else:
        # Ad-hoc / escape-hatch: validate against DefaultFilter shape only
        try:
            if isinstance(value, DefaultFilter):
                # Already a valid DefaultFilter instance
                return
            DefaultFilter.model_validate(value)
        except ValidationError as exc:
            raise PluginError(
                f'Ad-hoc filter "{filter_name}" has an invalid DefaultFilter shape: {exc}',
                path=filter_name,
                source_value=value,
                cause=exc,
            ) from exc


# ---------------------------------------------------------------------------
# classify_filters — three-bucket ADR-0012 classifier
# ---------------------------------------------------------------------------


def classify_filters(
    routes: PluginRoutes,
    resource: str,
    method: str,
    consumer_filters: dict[str, Any],
) -> OppFilters:
    """Classify consumer filter dict into the ADR-0012 OppFilters wire body.

    Three-bucket classification:
    - Bucket 1 (default): key is in ``DEFAULT_FILTER_NAMES`` (snake or camelCase alias) →
      normalize to snake_case, land in a named OppFilters field.
    - Bucket 2 (registered custom): key matches a registered ``CustomFilterSpec`` for the
      given resource/method → land in ``custom_filters``.
    - Bucket 3 (ad-hoc): any other key → land in ``custom_filters`` passthrough.

    Construction normalizes all default consumer keys to the form that
    ``OppFilters(**kwargs)`` accepts.  Because ``OppDefaultFilters`` does NOT set
    ``populate_by_name=True``, Pydantic v2 requires the alias form (e.g.
    ``closeDateRange``) for aliased fields.  Snake_case keys (e.g.
    ``close_date_range``) are therefore mapped to their alias via ``_SNAKE_TO_ALIAS``
    before construction.  Fields without aliases (e.g. ``status``) pass through
    unchanged.  The alternative — enabling ``populate_by_name=True`` on
    ``OppFilters.model_config`` — is deliberately avoided: the classifier must not
    modify core schema model config.

    Args:
        routes: Plugin route declarations (used to identify registered custom filters).
        resource: Resource name (e.g. ``"opportunities"``).
        method: Method name (e.g. ``"search"``).
        consumer_filters: Flat ``{name: DefaultFilter}`` dict from the consumer call site.

    Returns:
        ``OppFilters`` wire body.  Call ``.model_dump(by_alias=True, exclude_none=True)``
        for the ADR-0012 JSON wire shape.

    Raises:
        PluginError: When any filter value fails validation — registered and ad-hoc
            values at classification time, default values at ``OppFilters``
            construction. The error surface is uniform across all three buckets.
    """
    registered_specs: dict[str, CustomFilterSpec] = routes.get(resource, {}).get(
        method, {}
    )

    default_fields: dict[str, Any] = {}
    custom_buckets: dict[str, DefaultFilter] = {}

    for key, value in consumer_filters.items():
        if key in DEFAULT_FILTER_NAMES:
            # Bucket 1: core default filter.
            # OppFilters requires the alias form (e.g. "closeDateRange") when constructing
            # via **kwargs because populate_by_name is not set on OppDefaultFilters.
            # Normalize: camelCase aliases stay as-is; snake_case keys are mapped to their
            # alias; keys with no alias (e.g. "status") are passed through unchanged.
            # No validate_filter_call here: default values are validated at the wrapped
            # OppFilters construction below, against the named field's REAL type (e.g.
            # status → StringArrayFilter) — stricter than the permissive DefaultFilter
            # check, and the single validation point for this bucket.
            if key in _ALIAS_TO_SNAKE:
                # key is already the camelCase alias → use it directly
                opp_key = key
            else:
                # key is snake_case → convert to alias if one exists, else keep as-is
                opp_key = _SNAKE_TO_ALIAS.get(key, key)
            default_fields[opp_key] = value
        elif key in registered_specs:
            # Bucket 2: registered custom filter
            spec = registered_specs[key]
            validate_filter_call(spec, key, value)
            custom_buckets[key] = value
        else:
            # Bucket 3: ad-hoc / escape-hatch passthrough
            validate_filter_call(None, key, value)
            custom_buckets[key] = value

    # OppFilters requires the alias form for construction (populate_by_name is not set).
    # Use "customFilters" (the alias) rather than "custom_filters" (the field name).
    # This construction is the validation point for bucket-1 (default) values — wrap
    # pydantic failures in PluginError so the error contract is uniform across all
    # three buckets (consumers catch `except PluginError` regardless of bucket).
    try:
        return OppFilters(
            **default_fields,
            customFilters=custom_buckets if custom_buckets else None,
        )
    except ValidationError as exc:
        raise PluginError(
            f"Default filter failed validation: {exc.error_count()} error(s)",
            path=f"routes.{resource}.{method}",
            source_value=default_fields,
            cause=exc,
        ) from exc
