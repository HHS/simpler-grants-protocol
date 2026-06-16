"""Extension types and utilities for SDK schema customization."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from typing import Any, Literal, Optional, TypedDict

from ..schemas.pydantic.fields.custom import CustomFieldType

ConflictStrategy = Literal["error", "first_wins", "last_wins"]


class CustomFilterType(StrEnum):
    """Catalog of registerable filter types. Uses *Comparison/*Array/*Range wire values."""

    STRING_COMPARISON = "stringComparison"
    STRING_ARRAY = "stringArray"
    NUMBER_COMPARISON = "numberComparison"
    NUMBER_ARRAY = "numberArray"
    NUMBER_RANGE = "numberRange"
    INTEGER_COMPARISON = "integerComparison"
    BOOLEAN_COMPARISON = "booleanComparison"
    DATE_COMPARISON = "dateComparison"
    DATE_RANGE = "dateRange"
    MONEY_COMPARISON = "moneyComparison"
    MONEY_RANGE = "moneyRange"


@dataclass(frozen=True)
class CustomFilterSpec:
    """Per-filter declaration: filter_type constrains to a known type; description is optional.

    Frozen: a spec is an immutable declaration; mutating one after registration
    would bypass validate_routes. No ``value`` field — the allowed operator set
    is enforced by the filter_type's validation model at call time.
    """

    filter_type: CustomFilterType
    description: Optional[str] = None


@dataclass
class CustomFieldSpec:
    """Custom Field spec class to support adding custom fields"""

    field_type: CustomFieldType
    value: Optional[Any] = None
    name: str = ""
    description: str = ""


class SchemaExtensions(TypedDict, total=False):
    """Maps extensible model names to custom field specifications."""

    Opportunity: dict[str, CustomFieldSpec]
