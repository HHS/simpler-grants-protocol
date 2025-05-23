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


def set_constant_value(_data: dict, constant_value: Any) -> Any:
    """
    Handles a constant transformation by returning the specified constant value.

    Args:
        data: The source data dictionary (unused)
        constant_value: The constant value to return

    Returns:
        The constant value specified in the spec
    """
    return constant_value


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


# Registry for handlers
DEFAULT_HANDLERS: dict[str, handle_func] = {
    "field": pluck_field_value,
    "const": set_constant_value,
    "switch": switch_on_value,
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

    The mapping can contain nested transformations and supports three types of transformations:
    - field: Extracts a value from the data using a dot-notation path
    - const: Returns a constant value
    - match: Performs a case-based transformation based on a field value

    Args:
        data: The source data dictionary to transform
        mapping: A dictionary describing how to transform the data
        depth: Current recursion depth (used internally)
        max_depth: Maximum allowed recursion depth
        handlers: A dictionary of handler functions to use for the transformations

    Returns:
        A new dictionary containing the transformed data according to the mapping
    """
    if depth > max_depth:
        raise ValueError("Maximum transformation depth exceeded.")

    def transform_node(node: Any, depth: int) -> Any:
        if depth > max_depth:
            raise ValueError("Maximum transformation depth exceeded.")
        if isinstance(node, dict):
            for k in node:
                if k in handlers:
                    return handlers[k](data, node[k])
            return {k: transform_node(v, depth + 1) for k, v in node.items()}
        else:
            return node

    return transform_node(mapping, depth)
