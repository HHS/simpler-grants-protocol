"""Pure-runtime filter engine for the CommonGrants Python SDK.

Provides:
- ``f`` helper singleton for building DefaultFilter instances.
- ``FILTER_TYPE_SCHEMAS`` — map from CustomFilterType to the Pydantic validation model.
- ``DEFAULT_FILTER_NAMES`` — frozenset of all core default-filter field names (snake + alias).
- ``validate_routes(routes)`` — registration-time validator; raises FilterError.
- ``validate_filter_call(spec, filter_name, value)`` — call-time validator; returns the
  wire-ready DefaultFilter; raises FilterError.
- ``classify_filters(routes, resource, method, consumer_filters)`` — classifier producing
  the ``OppFilters`` search request body (default named fields + ``customFilters``).

No generate.py / codegen dependency. Correctness is enforced at runtime by Pydantic v2.
"""

from __future__ import annotations

from collections.abc import Mapping
from types import MappingProxyType
from typing import Any, Optional, Union, overload

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
    NumberRange,
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
from .types import FilterError, PluginRoutes

# ---------------------------------------------------------------------------
# f.* helpers
# ---------------------------------------------------------------------------


class _FHelpers:
    """Helper namespace for building filter values, typed to the precise model.

    Import as ``from common_grants_sdk.extensions import f`` and use as
    ``f.eq("open")``, ``f.in_([...])``, etc.

    Each builder is overloaded so the *static* return type is the precise filter
    model the value implies — ``f.eq("x")`` is a ``StringComparisonFilter``,
    ``f.eq(5)`` a ``NumberComparisonFilter``, ``f.eq(True)`` a
    ``BooleanComparisonFilter``, ``f.in_([...])`` a ``StringArrayFilter`` /
    ``NumberArrayFilter`` — so a typed filter bag (``OppSearchFilters``) composes
    with ``f.*`` at the call site with no annotation. Value types that don't map
    to a precise model (a Money dict, an ``ISODate``) fall through the final
    overload to ``DefaultFilter``, so ad-hoc and Money/date usage still works.

    At *runtime* each builder dispatches on the value type to construct the
    matching model; the ``model_dump()`` wire shape is ``{operator, value}`` for
    every model, identical to the old ``DefaultFilter`` output, so
    ``classify_filters`` and the wire body are unchanged. bool is checked before
    int/float (``bool`` is an ``int`` subclass) so ``f.eq(True)`` is a boolean
    filter, never a number.

    ``in_`` and ``not_in`` avoid Python reserved words; the wire operator values
    they emit are still ``"in"`` / ``"notIn"``.
    """

    # --- eq / neq: bool -> Boolean, str -> String, number -> Number, else Default ---
    # The ``bool`` overload must come first because ``bool`` is a subtype of
    # ``int``: a literal ``True`` would otherwise match the ``int | float`` arm and
    # be typed a NumberComparisonFilter. The overlap with the number arm (different
    # return types over the ``bool ⊂ int`` overlap) is intentional and the runtime
    # dispatch handles bool first, so the overlap warning is suppressed on the bool
    # overload for both checkers.
    @overload
    def eq(self, value: bool) -> BooleanComparisonFilter: ...  # type: ignore[overload-overlap]  # pyright: ignore[reportOverlappingOverload]
    @overload
    def eq(self, value: str) -> StringComparisonFilter: ...
    @overload
    def eq(self, value: Union[int, float]) -> NumberComparisonFilter: ...
    @overload
    def eq(self, value: Any) -> DefaultFilter: ...
    def eq(self, value: Any) -> BaseModel:
        """Build an ``eq`` filter, typed to the value's precise model."""
        return self._equivalence(EquivalenceOperator.EQUAL, value)

    @overload
    def neq(self, value: bool) -> BooleanComparisonFilter: ...  # type: ignore[overload-overlap]  # pyright: ignore[reportOverlappingOverload]
    @overload
    def neq(self, value: str) -> StringComparisonFilter: ...
    @overload
    def neq(self, value: Union[int, float]) -> NumberComparisonFilter: ...
    @overload
    def neq(self, value: Any) -> DefaultFilter: ...
    def neq(self, value: Any) -> BaseModel:
        """Build a ``neq`` filter, typed to the value's precise model."""
        return self._equivalence(EquivalenceOperator.NOT_EQUAL, value)

    def _equivalence(self, operator: EquivalenceOperator, value: Any) -> BaseModel:
        # bool first: bool is an int subclass, so it must not fall into the number arm.
        if isinstance(value, bool):
            return BooleanComparisonFilter(operator=operator, value=value)
        if isinstance(value, str):
            return StringComparisonFilter(operator=operator, value=value)
        if isinstance(value, (int, float)):
            return NumberComparisonFilter(operator=operator, value=value)
        return DefaultFilter(operator=operator, value=value)

    # --- gt / gte / lt / lte: number -> Number, else Default (Money dict, date) ---
    # The precise (number) overload intentionally overlaps the ``Any`` fallback;
    # the precise arm is listed first so it wins for numbers, and the runtime
    # dispatches the rest to DefaultFilter. pyright flags the precise/Any overlap
    # (mypy does not), so it is suppressed on the first overload of each builder.
    @overload
    def gt(  # pyright: ignore[reportOverlappingOverload]
        self, value: Union[int, float]
    ) -> NumberComparisonFilter: ...
    @overload
    def gt(self, value: Any) -> DefaultFilter: ...
    def gt(self, value: Any) -> BaseModel:
        """Build a ``gt`` filter, typed to the value's precise model."""
        return self._comparison(ComparisonOperator.GREATER_THAN, value)

    @overload
    def gte(  # pyright: ignore[reportOverlappingOverload]
        self, value: Union[int, float]
    ) -> NumberComparisonFilter: ...
    @overload
    def gte(self, value: Any) -> DefaultFilter: ...
    def gte(self, value: Any) -> BaseModel:
        """Build a ``gte`` filter, typed to the value's precise model."""
        return self._comparison(ComparisonOperator.GREATER_THAN_OR_EQUAL, value)

    @overload
    def lt(  # pyright: ignore[reportOverlappingOverload]
        self, value: Union[int, float]
    ) -> NumberComparisonFilter: ...
    @overload
    def lt(self, value: Any) -> DefaultFilter: ...
    def lt(self, value: Any) -> BaseModel:
        """Build a ``lt`` filter, typed to the value's precise model."""
        return self._comparison(ComparisonOperator.LESS_THAN, value)

    @overload
    def lte(  # pyright: ignore[reportOverlappingOverload]
        self, value: Union[int, float]
    ) -> NumberComparisonFilter: ...
    @overload
    def lte(self, value: Any) -> DefaultFilter: ...
    def lte(self, value: Any) -> BaseModel:
        """Build a ``lte`` filter, typed to the value's precise model."""
        return self._comparison(ComparisonOperator.LESS_THAN_OR_EQUAL, value)

    def _comparison(self, operator: ComparisonOperator, value: Any) -> BaseModel:
        # Numbers map to NumberComparisonFilter; bool is excluded (it is not a
        # comparable number here and NumberComparisonFilter rejects it). Money
        # dicts and ISODate strings fall through to DefaultFilter, where the
        # registered filter_type model validates them at call time.
        if not isinstance(value, bool) and isinstance(value, (int, float)):
            return NumberComparisonFilter(operator=operator, value=value)
        return DefaultFilter(operator=operator, value=value)

    # --- in_ / not_in: list[str] -> StringArray, list[number] -> NumberArray ---
    @overload
    def in_(  # pyright: ignore[reportOverlappingOverload]
        self, value: list[str]
    ) -> StringArrayFilter: ...
    @overload
    def in_(self, value: list[Union[int, float]]) -> NumberArrayFilter: ...
    @overload
    def in_(self, value: list[Any]) -> DefaultFilter: ...
    def in_(self, value: list[Any]) -> BaseModel:
        """Build an ``in`` filter (Python keyword workaround: ``f.in_``)."""
        return self._array(ArrayOperator.IN, value)

    @overload
    def not_in(  # pyright: ignore[reportOverlappingOverload]
        self, value: list[str]
    ) -> StringArrayFilter: ...
    @overload
    def not_in(self, value: list[Union[int, float]]) -> NumberArrayFilter: ...
    @overload
    def not_in(self, value: list[Any]) -> DefaultFilter: ...
    def not_in(self, value: list[Any]) -> BaseModel:
        """Build a ``notIn`` filter."""
        return self._array(ArrayOperator.NOT_IN, value)

    def _array(self, operator: ArrayOperator, value: list[Any]) -> BaseModel:
        # An all-string list is a StringArrayFilter; an all-number (non-bool) list
        # is a NumberArrayFilter. Mixed / Money-dict lists fall through to
        # DefaultFilter. An empty list is treated as a string array (the common
        # case; the registered filter_type re-validates either way).
        if all(isinstance(v, str) for v in value):
            return StringArrayFilter(operator=operator, value=value)
        if all(not isinstance(v, bool) and isinstance(v, (int, float)) for v in value):
            return NumberArrayFilter(operator=operator, value=value)
        return DefaultFilter(operator=operator, value=value)

    # --- like / not_like: always String ---
    def like(self, value: str) -> StringComparisonFilter:
        """Build a ``like`` string filter."""
        return StringComparisonFilter(operator=StringOperator.LIKE, value=value)

    def not_like(self, value: str) -> StringComparisonFilter:
        """Build a ``notLike`` string filter."""
        return StringComparisonFilter(operator=StringOperator.NOT_LIKE, value=value)

    # --- between / outside: number range -> NumberRange, else Default ---
    @overload
    def between(  # pyright: ignore[reportOverlappingOverload]
        self, min: Union[int, float], max: Union[int, float]
    ) -> NumberRangeFilter: ...
    @overload
    def between(self, min: Any, max: Any) -> DefaultFilter: ...
    def between(self, min: Any, max: Any) -> BaseModel:
        """Build a ``between`` range filter over ``{min, max}``."""
        return self._range(RangeOperator.BETWEEN, min, max)

    @overload
    def outside(  # pyright: ignore[reportOverlappingOverload]
        self, min: Union[int, float], max: Union[int, float]
    ) -> NumberRangeFilter: ...
    @overload
    def outside(self, min: Any, max: Any) -> DefaultFilter: ...
    def outside(self, min: Any, max: Any) -> BaseModel:
        """Build an ``outside`` range filter over ``{min, max}``."""
        return self._range(RangeOperator.OUTSIDE, min, max)

    def _range(self, operator: RangeOperator, min: Any, max: Any) -> BaseModel:
        # A numeric min+max is a NumberRangeFilter; date / Money ranges (whose
        # value sub-models differ) fall through to DefaultFilter, where the
        # registered filter_type (DATE_RANGE / MONEY_RANGE) validates the shape.
        numeric = all(
            not isinstance(v, bool) and isinstance(v, (int, float)) for v in (min, max)
        )
        if numeric:
            return NumberRangeFilter(
                operator=operator, value=NumberRange(min=min, max=max)
            )
        return DefaultFilter(operator=operator, value={"min": min, "max": max})


#: Module-level singleton — use as ``f.eq(...)``, ``f.in_([...])``, etc.
f = _FHelpers()

# ---------------------------------------------------------------------------
# FILTER_TYPE_SCHEMAS — call-time validation map
# ---------------------------------------------------------------------------

#: Maps each CustomFilterType to the Pydantic model used to validate operator/value shape.
#: ``booleanComparison`` uses the SDK-level ``BooleanComparisonFilter`` model (the spec
#: defines no boolean filter model).
#: Read-only: the catalog is closed — registering new filter types is a spec/SDK
#: change (extend CustomFilterType + this map together), not a runtime extension point.
FILTER_TYPE_SCHEMAS: Mapping[CustomFilterType, type[BaseModel]] = MappingProxyType(
    {
        CustomFilterType.STRING_COMPARISON: StringComparisonFilter,
        CustomFilterType.STRING_ARRAY: StringArrayFilter,
        CustomFilterType.NUMBER_COMPARISON: NumberComparisonFilter,
        CustomFilterType.NUMBER_ARRAY: NumberArrayFilter,
        CustomFilterType.NUMBER_RANGE: NumberRangeFilter,
        # integerComparison reuses NumberComparisonFilter — the spec defines no
        # integer filter model, so the int constraint is not schema-enforced
        CustomFilterType.INTEGER_COMPARISON: NumberComparisonFilter,
        CustomFilterType.BOOLEAN_COMPARISON: BooleanComparisonFilter,
        CustomFilterType.DATE_COMPARISON: DateComparisonFilter,
        CustomFilterType.DATE_RANGE: DateRangeFilter,
        CustomFilterType.MONEY_COMPARISON: MoneyComparisonFilter,
        CustomFilterType.MONEY_RANGE: MoneyRangeFilter,
    }
)

# ---------------------------------------------------------------------------
# DEFAULT_FILTER_NAMES — must include BOTH snake_case field names AND camelCase aliases
# ---------------------------------------------------------------------------

#: All core default-filter names from OppDefaultFilters: snake_case field names PLUS their
#: camelCase ``alias`` values.  Both forms are needed by BOTH consumers of this set:
#: ``validate_routes`` must catch a custom filter whose name shadows either form, and the
#: bucket-1 membership test in ``classify_filters`` must route either key form to a named
#: field (an alias-only set would silently drop snake_case keys into ``customFilters``).
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
#   - keys with no alias (e.g. "status") → kept as-is (snake == request key)
# ---------------------------------------------------------------------------

# Map from snake_case field name → camelCase alias (used for OppFilters construction).
# Only fields that declare an alias are included; alias-form keys and fields without
# aliases fall through ``_SNAKE_TO_ALIAS.get(key, key)`` unchanged — one lookup
# normalizes all three key classes.
_SNAKE_TO_ALIAS: dict[str, str] = {
    field_name: field_info.alias
    for field_name, field_info in OppDefaultFilters.model_fields.items()
    if field_info.alias
}

# ---------------------------------------------------------------------------
# validate_routes — registration-time validator
# ---------------------------------------------------------------------------


def validate_routes(routes: PluginRoutes) -> None:
    """Registration-time validator for a plugin's route filter declarations.

    Iterates every filter spec in ``routes`` and raises ``FilterError`` on:
    1. Unknown ``filter_type`` (not in ``FILTER_TYPE_SCHEMAS``).
    2. Filter name that collides with a core default-filter name in
       ``DEFAULT_FILTER_NAMES`` (the escape-hatch collision check; a namespaced
       key such as ``gov.<system>@<filterName>`` passes through as ad-hoc instead).

    Duplicate custom-filter names need no check: ``routes`` is dict-keyed, so a
    duplicate name cannot reach this validator (a duplicated literal key collapses
    silently to its last occurrence at dict construction, before this runs).

    Methods whose ``RouteDeclarations`` carry no ``filters`` key are skipped —
    declaring a method with no filters is valid.

    Args:
        routes: Route-keyed filter declarations as ``PluginRoutes``.

    Raises:
        FilterError: On the first invalid declaration found.
    """
    for resource, methods in routes.items():
        for method, declarations in methods.items():
            filter_specs = declarations.get("filters")
            if not filter_specs:
                continue
            for filter_name, spec in filter_specs.items():
                path = f"routes.{resource}.{method}.filters.{filter_name}"
                if spec.filter_type not in FILTER_TYPE_SCHEMAS:
                    raise FilterError(
                        f'Unknown filter_type "{spec.filter_type}" for filter "{filter_name}"',
                        path=path,
                        source_value=spec,
                    )
                if filter_name in DEFAULT_FILTER_NAMES:
                    raise FilterError(
                        f'Filter name "{filter_name}" collides with a default filter name',
                        path=path,
                        source_value=filter_name,
                    )


def _first_error_detail(exc: ValidationError) -> str:
    """One-line summary of the first pydantic error, for FilterError messages.

    The full ValidationError stays on ``cause`` for programmatic access; this
    puts the most useful line in ``str(exc)`` so a logged message says what
    failed, not just how many things did.
    """
    first = exc.errors()[0]
    loc = ".".join(str(part) for part in first["loc"]) or "<root>"
    return f"{first['msg']} (at {loc})"


# ---------------------------------------------------------------------------
# validate_filter_call — call-time validator
# ---------------------------------------------------------------------------


def validate_filter_call(
    spec: Optional[CustomFilterSpec],
    filter_name: str,
    value: Any,
) -> DefaultFilter:
    """Call-time validator for a single filter value.

    Validates ``value`` against the Pydantic model for ``spec.filter_type`` when
    ``spec`` is provided (registered filter), or against ``DefaultFilter`` when
    ``spec`` is ``None`` (ad-hoc / escape-hatch filter).

    Returns the validated filter as a ``DefaultFilter`` carrying the coerced
    operator/value — the wire payload is exactly what passed validation, never
    the raw input (lax coercion can differ from the input, e.g. ``"42"`` → ``42``).
    Model instances are re-validated via ``model_dump()`` rather than trusted:
    the filter models are mutable, so an instance that was valid at construction
    may not be valid now.

    Args:
        spec: The registered ``CustomFilterSpec`` for this filter, or ``None`` for ad-hoc.
        filter_name: The filter name (used in FilterError path).
        value: The filter value to validate (typically a ``DefaultFilter`` instance).

    Returns:
        The validated filter as a ``DefaultFilter`` with coerced operator/value.

    Raises:
        FilterError: On operator/value-shape mismatch (wrapping the pydantic
            ``ValidationError`` as ``cause``), or on a ``spec.filter_type`` not
            present in ``FILTER_TYPE_SCHEMAS`` — call ``validate_routes(routes)``
            at registration time to catch the latter earlier.
    """
    payload = value.model_dump() if isinstance(value, BaseModel) else value
    if spec is not None:
        model_cls = FILTER_TYPE_SCHEMAS.get(spec.filter_type)
        if model_cls is None:
            raise FilterError(
                f'Unknown filter_type "{spec.filter_type}" for filter '
                f'"{filter_name}" — call validate_routes(routes) at '
                "registration time to catch this earlier",
                path=f"filters.{filter_name}",
                source_value=spec,
            )
        try:
            validated = model_cls.model_validate(payload)
        except ValidationError as exc:
            raise FilterError(
                f'Filter "{filter_name}" failed validation: '
                f"{exc.error_count()} error(s); first: {_first_error_detail(exc)}",
                path=f"filters.{filter_name}",
                source_value=value,
                cause=exc,
            ) from exc
        # Re-shape to DefaultFilter so the wire bucket carries the coerced
        # operator/value. DefaultFilter.value is Any per the core spec, so
        # nothing the typed model accepted can fail here.
        return DefaultFilter.model_validate(validated.model_dump())
    # Ad-hoc / escape-hatch: validate against DefaultFilter shape only
    try:
        return DefaultFilter.model_validate(payload)
    except ValidationError as exc:
        raise FilterError(
            f'Ad-hoc filter "{filter_name}" has an invalid DefaultFilter shape: '
            f"{exc.error_count()} error(s); first: {_first_error_detail(exc)}",
            path=f"filters.{filter_name}",
            source_value=value,
            cause=exc,
        ) from exc


# ---------------------------------------------------------------------------
# classify_filters — ADR-0012 request-body classifier
# ---------------------------------------------------------------------------


# The Opportunity binding (OppDefaultFilters / OppFilters) is a known limitation;
# deriving both from the declared resource is tracked in
# https://github.com/HHS/simpler-grants-protocol/issues/896.
def classify_filters(
    routes: PluginRoutes,
    resource: str,
    method: str,
    consumer_filters: Mapping[str, Union[BaseModel, dict[str, Any]]],
) -> OppFilters:
    """Classify consumer filter dict into the ``OppFilters`` search request body.

    Three-bucket classification:
    - Bucket 1 (default): key is in ``DEFAULT_FILTER_NAMES`` (snake or camelCase alias) →
      normalize to the camelCase alias form, land in a named OppFilters field.
    - Bucket 2 (registered custom): key matches a registered ``CustomFilterSpec`` for the
      given resource/method → land in ``custom_filters``.
    - Bucket 3 (ad-hoc): any other key → land in ``custom_filters`` passthrough.

    The classifier is opportunity-bound today: default names come from
    ``OppDefaultFilters`` and the wire body is ``OppFilters``. A future
    revision will derive both from the declared resource.

    Registered specs are looked up by the exact ``(resource, method)`` strings
    declared in ``routes``. A non-matching pair (e.g. a pluralization typo in
    ``resource``) yields no registered bucket at all: every non-default filter is
    then validated only against the permissive ``DefaultFilter`` shape, exactly
    like ad-hoc input, with no error raised. Call sites must pass the same
    resource/method strings the plugin declared.

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
        consumer_filters: Flat ``{name: DefaultFilter}`` mapping from the consumer
            call site (raw ``{"operator": ..., "value": ...}`` dicts also accepted).

    Returns:
        ``OppFilters`` request body.  Call
        ``.model_dump(by_alias=True, exclude_none=True, mode="json")`` for the JSON
        body of the search request — ``mode="json"`` is required because
        coerced ``date`` objects are not JSON-serializable in the default python
        mode (operator enums are ``StrEnum`` and serialize fine either way).

    Raises:
        FilterError: When any filter value fails validation — registered and ad-hoc
            values at classification time, default values at ``OppFilters``
            construction — or when the snake_case and camelCase forms of the same
            default filter are both supplied. The error surface is uniform across
            all three buckets.
    """
    route_declarations = routes.get(resource, {}).get(method, {})
    registered_specs: dict[str, CustomFilterSpec] = route_declarations.get(
        "filters", {}
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
            alias_key = _SNAKE_TO_ALIAS.get(key, key)
            if alias_key in default_fields:
                # Snake and camel forms of the same field normalize to one key;
                # without this guard, plain dict assignment would silently drop
                # whichever form the consumer's dict ordered first.
                raise FilterError(
                    f'Default filter "{alias_key}" was supplied more than once '
                    "(snake_case and camelCase forms of the same filter)",
                    path=f"filters.{alias_key}",
                    source_value=value,
                )
            default_fields[alias_key] = value
        elif key in registered_specs:
            # Bucket 2: registered custom filter — ship the validated value,
            # never the raw input (see validate_filter_call)
            spec = registered_specs[key]
            custom_buckets[key] = validate_filter_call(spec, key, value)
        else:
            # Bucket 3: ad-hoc / escape-hatch passthrough — ship the validated value
            custom_buckets[key] = validate_filter_call(None, key, value)

    # OppFilters requires the alias form for construction (populate_by_name is not set).
    # Use "customFilters" (the alias) rather than "custom_filters" (the field name).
    # This construction is the validation point for bucket-1 (default) values — wrap
    # pydantic failures in FilterError so the error contract is uniform across all
    # three buckets (consumers catch `except FilterError` regardless of bucket).
    try:
        return OppFilters(
            **default_fields,
            customFilters=custom_buckets if custom_buckets else None,
        )
    except ValidationError as exc:
        # Name the failing field(s) so bucket-1 errors are as pinpointed as the
        # filters.<name> paths raised for buckets 2/3. The loc values are the
        # alias keys used at construction (e.g. "closeDateRange"); customFilters
        # values were already validated above, so only default fields fail here.
        failed = sorted({str(err["loc"][0]) for err in exc.errors() if err.get("loc")})
        field_list = ", ".join(failed) if failed else "<unknown>"
        raise FilterError(
            f"Filter(s) {field_list} failed validation: "
            f"{exc.error_count()} error(s); first: {_first_error_detail(exc)}",
            path=f"filters.{failed[0]}" if len(failed) == 1 else "filters",
            source_value=default_fields,
            cause=exc,
        ) from exc
