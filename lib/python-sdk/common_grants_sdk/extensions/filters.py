"""Pure-runtime filter engine for the CommonGrants Python SDK.

Provides:
- ``f`` helper singleton for building filter value models.
- ``DEFAULT_FILTER_NAMES`` — frozenset of all core default-filter field names (snake + alias).
- ``validate_routes(routes)`` — registration-time validator; raises FilterError.
- ``validate_filter_call(model_cls, filter_name, value)`` — call-time validator; fail-soft.
  Validates against ``model_cls`` (a registered filter's value model) or ``DefaultFilter``
  when ``model_cls`` is ``None``; returns ``(wire-ready DefaultFilter, None)`` on success
  or ``(None, FilterError)``.
- ``classify_filters(routes, resource, method, consumer_filters)`` — fail-soft classifier
  producing a ``ClassifyResult`` (the valid-only ``OppFilters`` search request body plus
  the collected ``FilterError``s; never raises on a bad call-time filter value). Registered
  custom filters are recovered from the route's TypedDict via ``get_type_hints``.

No generate.py / codegen dependency. Correctness is enforced at runtime by Pydantic v2.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import fields
from typing import Any, Optional, Union, get_type_hints, overload

from pydantic import BaseModel, ValidationError

from common_grants_sdk.schemas.pydantic.base import CommonGrantsBaseModel
from common_grants_sdk.schemas.pydantic.filters.base import (
    ArrayOperator,
    ComparisonOperator,
    DefaultFilter,
    EquivalenceOperator,
    RangeOperator,
    StringOperator,
)
from common_grants_sdk.schemas.pydantic.filters.boolean import BooleanComparisonFilter
from common_grants_sdk.schemas.pydantic.filters.numeric import (
    NumberArrayFilter,
    NumberComparisonFilter,
    NumberRange,
    NumberRangeFilter,
)
from common_grants_sdk.schemas.pydantic.filters.opportunity import (
    OppDefaultFilters,
    OppFilters,
    OpportunityFilters,
)
from common_grants_sdk.schemas.pydantic.filters.string import (
    StringArrayFilter,
    StringComparisonFilter,
)

from .types import ClassifyResult, FilterError, PluginRoutes

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

    ``in_`` and ``not_in`` avoid Python reserved words; the wire operator values
    they emit are still ``"in"`` / ``"notIn"``.
    """

    # --- eq / neq: bool -> Boolean, str -> String, number -> Number, else Default ---
    # bool overload first: bool ⊂ int, so a literal True would otherwise match the
    # number arm. The intentional overlap is suppressed on the bool overload.
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
        if isinstance(value, bool):  # bool ⊂ int — must precede the number arm
            return BooleanComparisonFilter(operator=operator, value=value)
        if isinstance(value, str):
            return StringComparisonFilter(operator=operator, value=value)
        if isinstance(value, (int, float)):
            return NumberComparisonFilter(operator=operator, value=value)
        return DefaultFilter(operator=operator, value=value)

    # --- gt / gte / lt / lte: number -> Number, else Default (Money dict, date) ---
    # Precise (number) overload first; its intentional overlap with the Any fallback
    # is suppressed on the first overload of each builder.
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
# Registered-filter recovery + validate_routes (registration-time validator)
# ---------------------------------------------------------------------------


def _registered_filter_models(route_td: Any) -> dict[str, type[BaseModel]]:
    """Recover a route's registered custom filters from its filter TypedDict.

    ``route_td`` is the TypedDict class an author put in the route slot (e.g.
    ``OppSearchFilters``), or ``None``. Returns ``{filterName: value model}`` for
    every key the author declared beyond the standard ``OpportunityFilters`` keys.
    Non-model annotations are skipped here; ``validate_routes`` (run at ``Client``
    construction) rejects them, so a caller who invokes ``classify_filters`` directly
    on unvalidated routes gets silent skipping rather than a raise.
    """
    if route_td is None:
        return {}
    standard = set(get_type_hints(OpportunityFilters))
    return {
        name: ann
        for name, ann in get_type_hints(route_td).items()
        if name not in standard and isinstance(ann, type) and issubclass(ann, BaseModel)
    }


def validate_routes(routes: PluginRoutes[Any]) -> None:
    """Registration-time validator for a plugin's typed route carriers.

    The typed carriers make a misspelled resource/method a *static* error. Two
    runtime checks remain:

    1. A registered custom filter's value type must be a filter value model (a
       ``CommonGrantsBaseModel`` subclass) — a mistyped TypedDict value (e.g.
       ``region: int``) would otherwise fail opaquely at call time.
    2. A route TypedDict must not redeclare a standard ``OpportunityFilters`` key
       with a different value type. Authors get the standard keys for free; a
       re-typed standard key (e.g. ``status: StringComparisonFilter``) creates a
       static/runtime mismatch — the call site sees the override, but
       classification validates against the real standard field type.

    Args:
        routes: Typed route registration (``PluginRoutes``).

    Raises:
        FilterError: On the first offending declaration.
    """
    standard_hints = get_type_hints(OpportunityFilters)
    for resource_field in fields(routes):
        resource_routes = getattr(routes, resource_field.name)
        for method_field in fields(resource_routes):
            route_td = getattr(resource_routes, method_field.name)
            if route_td is None:
                continue
            path_prefix = f"routes.{resource_field.name}.{method_field.name}"
            for name, ann in get_type_hints(route_td).items():
                if name in standard_hints:
                    if ann is not standard_hints[name]:
                        raise FilterError(
                            f'Filter "{name}" on '
                            f"{resource_field.name}.{method_field.name} redeclares a "
                            "standard filter with a different type",
                            path=f"{path_prefix}.{name}",
                            source_value=ann,
                        )
                    continue
                if not (
                    isinstance(ann, type) and issubclass(ann, CommonGrantsBaseModel)
                ):
                    raise FilterError(
                        f'Registered filter "{name}" on '
                        f"{resource_field.name}.{method_field.name} must be a filter "
                        "value model (a CommonGrantsBaseModel subclass)",
                        path=f"{path_prefix}.{name}",
                        source_value=ann,
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
    model_cls: Optional[type[BaseModel]],
    filter_name: str,
    value: Any,
) -> tuple[Optional[DefaultFilter], Optional[FilterError]]:
    """Call-time validator for a single filter value (fail-soft).

    Validates ``value`` against ``model_cls`` when provided (a registered filter's
    value model, recovered from the route's TypedDict), or against ``DefaultFilter``
    when ``model_cls`` is ``None`` (ad-hoc / escape-hatch filter).

    Never raises: returns ``(validated_filter, None)`` on success or
    ``(None, FilterError)`` on failure. The caller collects the error and skips
    the key rather than aborting the whole call.

    On success the returned filter carries the coerced operator/value, never the
    raw input — lax coercion can differ from the input (e.g. ``"42"`` → ``42``).
    Model instances are re-validated via ``model_dump()`` rather than trusted:
    the filter models are mutable, so an instance valid at construction may not
    be valid now.

    Args:
        model_cls: The registered filter's value model, or ``None`` for ad-hoc.
        filter_name: The filter name (used in FilterError path).
        value: The filter value to validate (typically a ``DefaultFilter`` instance).

    Returns:
        ``(DefaultFilter, None)`` when the value is valid, else ``(None, FilterError)``.
        The error wraps the pydantic ``ValidationError`` as ``cause``.
    """
    payload = value.model_dump() if isinstance(value, BaseModel) else value
    if model_cls is not None:
        try:
            validated = model_cls.model_validate(payload)
        except ValidationError as exc:
            return None, FilterError(
                f'Filter "{filter_name}" failed validation: '
                f"{exc.error_count()} error(s); first: {_first_error_detail(exc)}",
                path=f"filters.{filter_name}",
                source_value=value,
                cause=exc,
            )
        # Re-shape to DefaultFilter so the wire bucket carries the coerced
        # operator/value. DefaultFilter.value is Any per the core spec, so
        # nothing the typed model accepted can fail here.
        return DefaultFilter.model_validate(validated.model_dump()), None
    # Ad-hoc / escape-hatch: validate against DefaultFilter shape only
    try:
        return DefaultFilter.model_validate(payload), None
    except ValidationError as exc:
        return None, FilterError(
            f'Ad-hoc filter "{filter_name}" has an invalid DefaultFilter shape: '
            f"{exc.error_count()} error(s); first: {_first_error_detail(exc)}",
            path=f"filters.{filter_name}",
            source_value=value,
            cause=exc,
        )


# ---------------------------------------------------------------------------
# Default-field call-time validator (bucket 1)
# ---------------------------------------------------------------------------


def _validate_default_field(
    alias_key: str,
    value: Any,
) -> tuple[Optional[Any], Optional[FilterError]]:
    """Validate one default filter value against its REAL field type (fail-soft).

    Bucket-1 (default) values are validated against the named field's real type
    on ``OppDefaultFilters`` (e.g. ``status`` → ``StringArrayFilter``) — stricter
    than the permissive ``DefaultFilter`` shape. Each field is validated in
    isolation by constructing a single-field ``OppDefaultFilters`` keyed by its
    alias, so a malformed default can be dropped on its own without discarding
    the other valid default fields.

    Fail-soft: each field is validated on its own, collecting the error and
    skipping the key on failure. Returns ``(value, None)`` when valid (the
    original value is kept — construction is a validation gate, not a reshape)
    or ``(None, FilterError)`` when invalid.
    """
    try:
        OppDefaultFilters.model_validate({alias_key: value})
    except ValidationError as exc:
        return None, FilterError(
            f'Default filter "{alias_key}" failed validation: '
            f"{exc.error_count()} error(s); first: {_first_error_detail(exc)}",
            path=f"filters.{alias_key}",
            source_value=value,
            cause=exc,
        )
    return value, None


# ---------------------------------------------------------------------------
# classify_filters — ADR-0012 request-body classifier
# ---------------------------------------------------------------------------


# The Opportunity binding (OppDefaultFilters / OppFilters) is a known limitation;
# deriving both from the declared resource is tracked in
# https://github.com/HHS/simpler-grants-protocol/issues/896.
def classify_filters(
    routes: PluginRoutes[Any],
    resource: str,
    method: str,
    consumer_filters: Mapping[str, Union[BaseModel, dict[str, Any]]],
) -> ClassifyResult[OppFilters]:
    """Classify consumer filter dict into the ``OppFilters`` search request body.

    Three-bucket classification:
    - Bucket 1 (default): key is in ``DEFAULT_FILTER_NAMES`` (snake or camelCase alias) →
      normalize to the camelCase alias form, land in a named OppFilters field.
    - Bucket 2 (registered custom): key matches a filter registered on the route's
      TypedDict for the given resource/method → land in ``custom_filters``.
    - Bucket 3 (ad-hoc): any other key → land in ``custom_filters`` passthrough.

    Validation is **fail-soft**: a key that fails its call-time validation is
    dropped from the result and its ``FilterError`` collected into
    ``ClassifyResult.errors``; the call never raises on a bad filter value.
    (Registration-time validation in ``validate_routes`` still raises.)

    Opportunity-bound — see the limitation note above the function.

    Registered specs are looked up by the exact ``(resource, method)`` strings
    declared in ``routes``. A non-matching pair (e.g. a pluralization typo in
    ``resource``) yields no registered bucket at all: every non-default filter is
    then validated only against the permissive ``DefaultFilter`` shape, exactly
    like ad-hoc input. Call sites must pass the same resource/method strings the
    plugin declared.

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
        ``ClassifyResult`` — ``.result`` is the valid-only ``OppFilters`` request
        body; ``.errors`` is the collected list of ``FilterError``s for keys that
        failed (empty on full success). Call
        ``.result.model_dump(by_alias=True, exclude_none=True, mode="json")`` for
        the JSON body of the search request — ``mode="json"`` is required because
        coerced ``date`` objects are not JSON-serializable in the default python
        mode (operator enums are ``StrEnum`` and serialize fine either way).
    """
    route = getattr(routes, resource, None)
    route_td = getattr(route, method, None) if route is not None else None
    registered = _registered_filter_models(route_td)

    default_fields: dict[str, Any] = {}
    custom_buckets: dict[str, DefaultFilter] = {}
    errors: list[FilterError] = []

    for key, value in consumer_filters.items():
        if key in DEFAULT_FILTER_NAMES:
            # Bucket 1: core default filter.
            # OppFilters requires the alias form (e.g. "closeDateRange") when constructing
            # via **kwargs because populate_by_name is not set on OppDefaultFilters.
            # Normalize: camelCase aliases stay as-is; snake_case keys are mapped to their
            # alias; keys with no alias (e.g. "status") are passed through unchanged.
            # Validate per-field against the named field's actual type (e.g.
            # status → StringArrayFilter) — stricter than the permissive DefaultFilter
            # check. Fail-soft: an invalid value is collected and skipped.
            alias_key = _SNAKE_TO_ALIAS.get(key, key)
            if alias_key in default_fields:
                # Snake and camel forms of the same field normalize to one key;
                # without this guard, plain dict assignment would silently drop
                # whichever form the consumer's dict ordered first. Fail-soft:
                # keep the first-seen value, drop the duplicate, collect a warning.
                errors.append(
                    FilterError(
                        f'Default filter "{alias_key}" was supplied more than once '
                        "(snake_case and camelCase forms of the same filter)",
                        path=f"filters.{alias_key}",
                        source_value=value,
                    )
                )
                continue
            validated, error = _validate_default_field(alias_key, value)
            if error is not None:
                errors.append(error)
                continue
            default_fields[alias_key] = validated
        elif key in registered:
            # Bucket 2: registered custom filter — validate against the value
            # model recovered from the route's TypedDict; ship the validated
            # value, never the raw input. Fail-soft: collect and skip.
            validated, error = validate_filter_call(registered[key], key, value)
            if error is not None:
                errors.append(error)
                continue
            custom_buckets[key] = validated  # type: ignore[assignment]
        else:
            # Bucket 3: ad-hoc / escape-hatch passthrough — ship the validated value.
            # Fail-soft: collect the error and skip the key.
            validated, error = validate_filter_call(None, key, value)
            if error is not None:
                errors.append(error)
                continue
            custom_buckets[key] = validated  # type: ignore[assignment]

    # OppFilters requires the alias form for construction (populate_by_name is not set).
    # Use "customFilters" (the alias) rather than "custom_filters" (the field name).
    # Every value in default_fields / custom_buckets already passed validation
    # above, so this construction cannot fail on a value-shape error.
    result = OppFilters(
        **default_fields,
        customFilters=custom_buckets if custom_buckets else None,
    )
    return ClassifyResult(result=result, errors=errors)
