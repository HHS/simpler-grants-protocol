"""Safe access helper for nested optional Pydantic models."""
from typing import Any, Generic, TypeVar

T = TypeVar("T")


class SafeAccess(Generic[T]):
    """The '?' simulator for Python.

    Allows chained attribute access through None values without crashing.
    """

    __slots__ = ("_value",)

    def __init__(self, value: Any) -> None:
        self._value = value

    def __getattr__(self, name: str) -> "SafeAccess[Any]":
        if self._value is None:
            return SafeAccess(None)
        return SafeAccess(getattr(self._value, name, None))

    def __call__(self, default: T | None = None) -> T | None:
        """Unwrap the value, returning default if the chain hit a None."""
        return self._value if self._value is not None else default
