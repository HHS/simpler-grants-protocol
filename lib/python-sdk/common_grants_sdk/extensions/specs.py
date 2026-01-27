"""Dataclass for custom field specs"""

from dataclasses import dataclass
from typing import Any, Optional

from ..schemas.pydantic.fields.custom import CustomFieldType


@dataclass
class CustomFieldSpec:
    """Custom Field spec class to support adding custom fields"""

    key: str 
    field_type: CustomFieldType 
    value: Optional[Any] = None
