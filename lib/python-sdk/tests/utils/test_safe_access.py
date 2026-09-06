"""Tests for SafeAccess helper."""
from pydantic import BaseModel
import pytest
from common_grants_sdk.utils.safe_access import SafeAccess


class Inner(BaseModel):
    value: str


class Middle(BaseModel):
    inner: Inner | None = None


class Outer(BaseModel):
    middle: Middle | None = None


def test_full_chain_returns_value():
    obj = Outer(middle=Middle(inner=Inner(value="hello")))
    result = SafeAccess(obj).middle.inner.value("default")
    assert result == "hello"


def test_broken_chain_returns_default():
    obj = Outer(middle=None)
    result = SafeAccess(obj).middle.inner.value("default")
    assert result == "default"


def test_missing_attribute_returns_none_wrapper():
    obj = Outer(middle=Middle(inner=None))
    result = SafeAccess(obj).middle.inner.value("default")
    assert result == "default"


def test_direct_none_input():
    result = SafeAccess(None).foo.bar("fallback")
    assert result == "fallback"
