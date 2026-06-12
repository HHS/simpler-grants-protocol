"""Extension types and utilities for SDK schema customization."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal, Optional, TypedDict

from ..schemas.pydantic.fields.custom import CustomFieldType

ConflictStrategy = Literal["error", "first_wins", "last_wins"]


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
