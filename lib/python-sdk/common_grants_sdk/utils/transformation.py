"""
This module provides a utility function for transforming data using a mapping.

The transform_from_mapping function takes a data dictionary and a mapping dictionary.
The mapping dictionary describes how to transform the data dictionary into a new dictionary.
"""

from typing import Any, Callable

handle_func = Callable[[dict, Any], Any]


def get_from_path(data: dict, path: str, default: Any = None) -> Any:
    """
    Gets a value from a dictionary using dot notation.

    Args:
        data: The dictionary to extract the value from
        path: A dot-separated string representing the path to the value
        default: The default value to return if the path doesn't exist

    Returns:
        The value at the specified path, or the default value if the path doesn't exist
    """
    parts = path.split(".")
    for part in parts:
        if isinstance(data, dict) and part in data:
            data = data[part]
        else:
            return default
    return data


def pluck_field_value(data: dict, field_path: str) -> Any:
    """
    Handles a field transformation by extracting a value from the data using the specified field path.

    Args:
        data: The source data dictionary
        field_path: A dot-separated string representing the path to the value

    Returns:
        The value from the specified field path in the data
    """
    return get_from_path(data, field_path)


def switch_on_value(data: dict, switch_spec: dict) -> Any:
    """
    Handles a match transformation by looking up a value in a case dictionary.

    Args:
        data: The source data dictionary
        switch_spec: A dictionary containing:
            - 'field': The field path to get the value from
            - 'case': A dictionary mapping values to their transformations
            - 'default': (optional) The default value if no match is found

    Returns:
        The transformed value based on the match, or the default value if no match is found
    """
    val = get_from_path(data, switch_spec.get("field", ""))
    lookup = switch_spec.get("case", {})
    return lookup.get(val, switch_spec.get("default"))


def const_value(_data: dict, value: Any) -> Any:
    """
    Handles a const transformation by returning a fixed literal value.

    Args:
        _data: The source data dictionary (unused)
        value: The constant value to return

    Returns:
        The constant value exactly as specified
    """
    return value


def number_to_string(data: dict, field_path: str) -> str | None:
    """
    Handles a numberToString transformation by extracting a numeric value and coercing it to a string.

    Args:
        data: The source data dictionary
        field_path: A dot-separated string representing the path to the numeric value

    Returns:
        The value at the specified path converted to a string, or None if the path doesn't exist
    """
    val = get_from_path(data, field_path)
    return str(val) if val is not None else None


def string_to_number(data: dict, field_path: str) -> int | float | None:
    """
    Handles a stringToNumber transformation by extracting a string value and coercing it to a number.

    Attempts integer conversion first; falls back to float for decimal strings.

    Args:
        data: The source data dictionary
        field_path: A dot-separated string representing the path to the string value

    Returns:
        The value at the specified path converted to int or float, or None if the path doesn't exist

    Raises:
        ValueError: If the extracted value cannot be converted to a number
    """
    val = get_from_path(data, field_path)
    if val is None:
        return None
    s = str(val)
    try:
        return int(s)
    except ValueError:
        return float(s)


class HandlerError(ValueError):
    """Raised when a handler function raises, carrying the handler name for attribution.

    Extends ValueError so that existing ``except ValueError`` handlers around
    ``transform_from_mapping``, ``dump_with_mapping``, and ``validate_with_mapping``
    continue to work after this class was introduced.  Callers that want handler-level
    attribution can catch ``HandlerError`` specifically (it is more derived).
    """

    def __init__(self, handler: str, cause: Exception) -> None:
        super().__init__(str(cause))
        self.handler = handler
        self.cause = cause


# Registry for handlers
DEFAULT_HANDLERS: dict[str, handle_func] = {
    "const": const_value,
    "field": pluck_field_value,
    "match": switch_on_value,  # ADR-0017 canonical name
    "numberToString": number_to_string,
    "stringToNumber": string_to_number,
    "switch": switch_on_value,  # alias kept for backward compatibility
}


def transform_from_mapping(
    data: dict,
    mapping: dict,
    depth: int = 0,
    max_depth: int = 500,
    handlers: dict[str, handle_func] = DEFAULT_HANDLERS,
) -> dict:
    """
    Transforms a data dictionary according to a mapping specification.

    The mapping supports both literal values and transformations keyed by
    the following reserved words:
    - `const`: Returns a fixed literal value regardless of input data
    - `field`: Extracts a value from the data using a dot-notation path
    - `match`: Performs a case-based lookup based on a field value (canonical)
    - `numberToString`: Extracts a numeric value and coerces it to a string
    - `stringToNumber`: Extracts a string value and coerces it to int or float
    - `switch`: Alias for `match` (kept for backward compatibility)

    Args:
        data: The source data dictionary to transform
        mapping: A dictionary describing how to transform the data
        depth: Current recursion depth (used internally)
        max_depth: Maximum allowed recursion depth
        handlers: A dictionary of handler functions to use for the transformations

    Returns:
        A new dictionary containing the transformed data according to the mapping

    Example:

    ```python
    source_data = {
        "opportunity_status": "closed",
        "opportunity_amount": 1000,
    }

    mapping = {
        "status": { "field": "opportunity_status" },
        "amount": {
            "value": { "field": "opportunity_amount" },
            "currency": "USD",
        },
    }

    result = transform_from_mapping(source_data, mapping)

    assert result == {
        "status": "closed",
        "amount": {
            "value": 1000,
            "currency": "USD",
        },
    }
    ```
    """
    # Normalize Pydantic model instances to plain dicts so that field path
    # extraction works regardless of whether the caller passes a raw dict or a
    # validated model (e.g. the output of to_common with common_model set).
    # mode="json" matches the convention used by CommonGrantsBaseModel.dump_with_mapping.
    if hasattr(data, "model_dump"):
        data = data.model_dump(mode="json")

    # Check for maximum depth
    # This is a sanity check to prevent stack overflow from deeply nested mappings
    # which may be a concern when running this function on third-party mappings
    if depth > max_depth:
        raise ValueError("Maximum transformation depth exceeded.")

    def transform_node(node: Any, depth: int) -> Any:
        # Check for maximum depth
        # This is a sanity check to prevent stack overflow from deeply nested mappings
        # which may be a concern when running this function on third-party mappings
        if depth > max_depth:
            raise ValueError("Maximum transformation depth exceeded.")

        # If the node is not a dictionary, return as is
        # This allows users to set a key to a constant value (string or number)
        if not isinstance(node, dict):
            return node

        # Walk through each key in the current node
        for k, v in node.items():

            # If the key is a reserved word, call the matching handler function
            # on the value and return the result.
            # Node: `{ "field": "opportunity_status" }`
            # Returns: `extract_field_value(data, "opportunity_status")`
            if k in handlers:
                handler_func = handlers[k]
                try:
                    return handler_func(data, v)
                except Exception as exc:
                    raise HandlerError(k, exc) from exc

            # Otherwise, preserve the dictionary structure and
            # recursively apply the transformation to each value.
            # Node:
            # ```
            # {
            #   "status": { "field": "opportunity_status" },
            #   "amount": { "field": "opportunity_amount" },
            # }
            # ```
            # Returns:
            # ```
            # {
            #   "status": transform_node({ "field": "opportunity_status" }, depth + 1)
            #   "amount": transform_node({ "field": "opportunity_amount" }, depth + 1)
            # }
            # ```
            return {k: transform_node(v, depth + 1) for k, v in node.items()}

    # Recursively walk the mapping until all nested transformations are applied
    return transform_node(mapping, depth)
