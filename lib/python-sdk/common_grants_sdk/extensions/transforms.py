"""build_transforms() — generates to_common/from_common callables from mapping dicts.

Using this utility is optional — plugin authors may provide plain hand-written
callables instead.

Mappings are validated at call time. Custom handler names are
registered per call only; name collisions with defaults raise at call time
rather than silently shadowing them.
"""

from __future__ import annotations

from typing import Any, Callable

from common_grants_sdk.utils.transformation import (
    DEFAULT_HANDLERS,
    transform_from_mapping,
)

from .types import Handler, PluginError, TransformResult


def _validate_mapping(mapping: Any, known_handlers: set[str], path: str = "") -> None:
    """Walk the mapping tree and raise ValueError on structural malformation.

    For each dict node:
    - If a key is a known handler, the corresponding value is a runtime-only
      handler argument and is NOT recursed into.
    - All other keys are output field names (always valid); their values are
      recursed into.

    Raises ValueError if any node is not a dict, string, number, boolean, or None
    (e.g. a list where a scalar or dict is expected).

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

    for key, value in mapping.items():
        current_path = f"{path}.{key}" if path else key
        if key in known_handlers:
            # Handler invocation — argument is runtime-only, do not recurse
            continue
        _validate_mapping(value, known_handlers, current_path)


def build_transforms(
    to_common_mapping: dict[str, Any],
    from_common_mapping: dict[str, Any],
    handlers: dict[str, Handler] | None = None,
) -> tuple[
    Callable[[Any], TransformResult[Any]],
    Callable[[Any], TransformResult[Any]],
]:
    """Generate to_common and from_common callables from mapping dicts.

    Args:
        to_common_mapping: mapping from native source → CommonGrants.
        from_common_mapping: mapping from CommonGrants → native source.
        handlers: Optional additional handlers registered for this call only.
            Keys must not collide with DEFAULT_HANDLERS (raises ValueError if they do).

    Returns:
        A (to_common, from_common) tuple. Each callable accepts a dict and returns
        TransformResult[Any]. Failures surface as PluginError entries in
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

    def to_common(native: Any) -> TransformResult[Any]:
        try:
            result = transform_from_mapping(native, to_common_mapping, handlers=merged)
            # TODO (full SDK): run model_validate on result and append validation
            # failures to errors. Belongs in define_plugin() wrapper which knows
            # the target Pydantic model, not here.
            return TransformResult(result=result, errors=[])
        except Exception as exc:
            error = PluginError(str(exc), path=None, source_value=native, cause=exc)
            return TransformResult(result={}, errors=[error])

    def from_common(common: Any) -> TransformResult[Any]:
        try:
            result = transform_from_mapping(
                common, from_common_mapping, handlers=merged
            )
            return TransformResult(result=result, errors=[])
        except Exception as exc:
            error = PluginError(str(exc), path=None, source_value=common, cause=exc)
            return TransformResult(result={}, errors=[error])

    return to_common, from_common
