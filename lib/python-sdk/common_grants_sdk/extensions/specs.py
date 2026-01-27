"""Dataclass for custom field specs"""

from dataclasses import dataclass
from typing import Any, Optional
from pydantic import Field
from ..schemas.pydantic.fields.custom import CustomFieldType


@dataclass
class CustomFieldSpec:
    """Custom Field spec class to support adding custom fields"""

    key: str = Field(..., description="Custom field key name")
    field_type: CustomFieldType = Field(
        ..., alias="fieldType", description="Field type to be defined"
    )
    value: Optional[Any] = Field(default=None, description="schema definition value")
