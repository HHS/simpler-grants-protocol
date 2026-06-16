"""build_transforms() — generates to_common/from_common callables from mapping dicts.

Using this utility is optional — plugin authors may provide plain hand-written
callables instead.

Mappings are validated at call time. Custom handler names are
registered per call only; name collisions with defaults raise at call time
rather than silently shadowing them.
"""

from __future__ import annotations

from typing import Any, Callable, TypeVar, overload

from pydantic import BaseModel, ValidationError

from common_grants_sdk.utils.transformation import (
    DEFAULT_HANDLERS,
    HandlerError,
    transform_from_mapping,
)

from .types import Handler, TransformError, TransformResult

TCommon = TypeVar("TCommon", bound=BaseModel)
TSource = TypeVar("TSource", bound=BaseModel)


def _validate_output_paths(
    mapping: dict[str, Any],
    model: type[BaseModel],
    known_handlers: set[str],
    direction: str = "to_common",
) -> None:
    """Validate that top-level output keys in mapping are valid fields on model.

    Called when common_schema is supplied to build_transforms(). Custom fields
    declared by the plugin appear as regular model fields on the generated common
    model and are therefore treated as valid output paths automatically.

    Raises ValueError if any top-level key is not a field name or alias on model.
    """
    valid_names: set[str] = set(model.model_fields.keys())
    for field_info in model.model_fields.values():
        if field_info.alias:
            valid_names.add(field_info.alias)

    # Top-level handler invocations (rare but structurally valid) are not output keys
    output_keys = {k for k in mapping if k not in known_handlers}
    invalid = output_keys - valid_names
    if invalid:
        noun = "field" if len(invalid) == 1 else "fields"
        raise ValueError(
            f"build_transforms ({direction}_mapping): unknown output {noun} "
            f"{sorted(invalid)!r} for model {model.__name__}. "
            f"Declare them as custom_fields in SchemaInput or check the field name."
        )


def _validate_mapping(mapping: Any, known_handlers: set[str], path: str = "") -> None:
    """Walk the mapping tree and raise ValueError on structural malformation.

    For each dict node:
    - If a key is a known handler, the node must contain ONLY that handler key.
      The corresponding value is a runtime-only handler argument and is NOT
      recursed into.
    - All other keys are output field names (always valid); their values are
      recursed into.

    Raises ValueError if any node is not a dict, string, number, boolean, or None
    (e.g. a list where a scalar or dict is expected), or if a handler key appears
    alongside sibling keys in the same dict (ambiguous — handler invocations must
    be the sole key in their dict).

    Note: this function cannot detect intended-but-unknown handler invocations
    because unknown keys are indistinguishable from output field names at static
    analysis time. That detection is deferred to the full SDK.
    """
    if mapping is None or isinstance(mapping, (str, int, float, bool)):
        return  # primitives and None are valid literals

    if not isinstance(mapping, dict):
        raise ValueError(
            f"Invalid mapping node at '{path}': expected dict, str, number, or bool, "
            f"got {type(mapping).__name__}"
        )

    handler_keys = [k for k in mapping if k in known_handlers]
    if handler_keys and len(mapping) > 1:
        label = f" at '{path}'" if path else ""
        raise ValueError(
            f"Invalid mapping node{label}: handler key {handler_keys[0]!r} "
            f"cannot have sibling keys {sorted(k for k in mapping if k not in known_handlers)!r}. "
            f"A handler invocation must be the only key in its dict."
        )

    for key, value in mapping.items():
        current_path = f"{path}.{key}" if path else key
        if key in known_handlers:
            # Handler invocation — argument is runtime-only, do not recurse
            continue
        _validate_mapping(value, known_handlers, current_path)


@overload
def build_transforms(
    to_common_mapping: dict[str, Any],
    from_common_mapping: dict[str, Any],
    handlers: dict[str, Handler] | None = ...,
    common_schema: None = ...,
    source_schema: None = ...,
) -> tuple[
    Callable[[Any], TransformResult[Any]],
    Callable[[Any], TransformResult[Any]],
]: ...


@overload
def build_transforms(
    to_common_mapping: dict[str, Any],
    from_common_mapping: dict[str, Any],
    handlers: dict[str, Handler] | None = ...,
    common_schema: type[TCommon] = ...,
    source_schema: None = ...,
) -> tuple[
    Callable[[Any], TransformResult[TCommon | dict[str, Any]]],
    Callable[[Any], TransformResult[Any]],
]: ...


@overload
def build_transforms(
    to_common_mapping: dict[str, Any],
    from_common_mapping: dict[str, Any],
    handlers: dict[str, Handler] | None = ...,
    common_schema: None = ...,
    source_schema: type[TSource] = ...,
) -> tuple[
    Callable[[Any], TransformResult[Any]],
    Callable[[Any], TransformResult[TSource | dict[str, Any]]],
]: ...


@overload
def build_transforms(
    to_common_mapping: dict[str, Any],
    from_common_mapping: dict[str, Any],
    handlers: dict[str, Handler] | None = ...,
    common_schema: type[TCommon] = ...,
    source_schema: type[TSource] = ...,
) -> tuple[
    Callable[[Any], TransformResult[TCommon | dict[str, Any]]],
    Callable[[Any], TransformResult[TSource | dict[str, Any]]],
]: ...


def build_transforms(
    to_common_mapping: dict[str, Any],
    from_common_mapping: dict[str, Any],
    handlers: dict[str, Handler] | None = None,
    common_schema: type[BaseModel] | None = None,
    source_schema: type[BaseModel] | None = None,
) -> tuple[
    Callable[[Any], TransformResult[Any]],
    Callable[[Any], TransformResult[Any]],
]:
    """Generate to_common and from_common callables from mapping dicts.

    Args:
        to_common_mapping: mapping from source system → CommonGrants.
        from_common_mapping: mapping from CommonGrants → source system.
        handlers: Optional additional handlers registered for this call only.
            Keys must not collide with DEFAULT_HANDLERS (raises ValueError if they do).
            Each ``build_transforms()`` call gets its own isolated handler registry —
            handlers passed here are not visible to any other call.

            Example::

                def handle_upper(data, path):
                    parts = path.split(".")
                    val = data
                    for p in parts:
                        val = val.get(p) if isinstance(val, dict) else None
                    return str(val).upper() if val is not None else None

                to_common, _ = build_transforms(
                    {"title": {"upper": "data.opportunity_title"}},
                    {},
                    handlers={"upper": handle_upper},
                )
        common_schema: Optional Pydantic model class to validate the to_common output
            against. Must be the fully extended generated model class (e.g. the
            generated Opportunity from generated/schemas.py), NOT the base class
            (e.g. OpportunityBase). Passing a base class will silently weaken
            validation — custom_fields will only be checked against
            dict[str, CustomField] rather than the typed container produced by the
            plugin's custom field declarations. When provided, model_validate is
            called on the transform result and any ValidationErrors are appended to
            TransformResult.errors rather than raised.

            Note on result shape: when common_schema is set, TransformResult.result
            holds the validated Pydantic instance on success, or the raw transformed
            dict on ValidationError (so callers can inspect the malformed data
            alongside the errors). This is intentional — check TransformResult.errors
            before consuming TransformResult.result.
        source_schema: Optional Pydantic model class to validate the from_common output
            against. Without this, from_common casts its result to a plain dict with
            no runtime check, so the return type provides no real safety guarantee.
            When provided, model_validate is called on the transform result and any
            ValidationErrors are appended to TransformResult.errors rather than raised.
            The result shape follows the same convention as common_schema: a validated
            model instance on success, or the raw dict alongside errors on failure.

    Returns:
        A (to_common, from_common) tuple. Each callable accepts a dict and returns
        TransformResult[Any]. Failures surface as TransformError entries in
        TransformResult.errors rather than being raised.

    Raises:
        ValueError: At call time if handler names collide with defaults,
            or if either mapping has structural malformation.

    TODO (full SDK):
        - Validate field-path resolvability at call time (requires sample data or
          schema introspection).
    """
    # Custom handler names must not shadow defaults
    if handlers:
        collisions = set(handlers) & set(DEFAULT_HANDLERS)
        if collisions:
            raise ValueError(
                f"build_transforms: handler names collide with defaults: {sorted(collisions)}"
            )

    merged = {**DEFAULT_HANDLERS, **(handlers or {})}
    known = set(merged)

    # Validate mapping structure at call time
    _validate_mapping(to_common_mapping, known)
    _validate_mapping(from_common_mapping, known)

    # When common_schema is provided, validate that to_common output keys are real fields
    if common_schema is not None:
        _validate_output_paths(to_common_mapping, common_schema, known, "to_common")
    # When source_schema is provided, validate that from_common output keys are real fields
    if source_schema is not None:
        _validate_output_paths(from_common_mapping, source_schema, known, "from_common")

    def to_common(native: Any) -> TransformResult[Any]:
        try:
            result = transform_from_mapping(native, to_common_mapping, handlers=merged)
        except HandlerError as exc:
            error = TransformError(
                str(exc.cause),
                path=None,
                handler=exc.handler,
                source_value=native,
                cause=exc.cause,
            )
            return TransformResult(result={}, errors=[error])
        except Exception as exc:
            error = TransformError(str(exc), path=None, source_value=native, cause=exc)
            return TransformResult(result={}, errors=[error])

        if common_schema is None:
            return TransformResult(result=result, errors=[])

        try:
            validated = common_schema.model_validate(result)
            return TransformResult(result=validated, errors=[])
        except ValidationError as exc:
            errors = [
                TransformError(
                    e["msg"],
                    path=".".join(str(loc) for loc in e["loc"]),
                )
                for e in exc.errors()
            ]
            return TransformResult(result=result, errors=errors)
        except Exception as exc:
            error = TransformError(str(exc), path=None, source_value=result, cause=exc)
            return TransformResult(result=result, errors=[error])

    def from_common(common: Any) -> TransformResult[Any]:
        try:
            result = transform_from_mapping(
                common, from_common_mapping, handlers=merged
            )
        except HandlerError as exc:
            error = TransformError(
                str(exc.cause),
                path=None,
                handler=exc.handler,
                source_value=common,
                cause=exc.cause,
            )
            return TransformResult(result={}, errors=[error])
        except Exception as exc:
            error = TransformError(str(exc), path=None, source_value=common, cause=exc)
            return TransformResult(result={}, errors=[error])

        if source_schema is None:
            return TransformResult(result=result, errors=[])

        try:
            validated = source_schema.model_validate(result)
            return TransformResult(result=validated, errors=[])
        except ValidationError as exc:
            errors = [
                TransformError(
                    e["msg"],
                    path=".".join(str(loc) for loc in e["loc"]),
                )
                for e in exc.errors()
            ]
            return TransformResult(result=result, errors=errors)
        except Exception as exc:
            error = TransformError(str(exc), path=None, source_value=result, cause=exc)
            return TransformResult(result=result, errors=[error])

    return to_common, from_common
