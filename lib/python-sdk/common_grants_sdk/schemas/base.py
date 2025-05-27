import json
from typing import Self

from pydantic import BaseModel, ConfigDict

from common_grants_sdk.utils.transformation import transform_from_mapping


class CommonGrantsBaseModel(BaseModel):
    """Base model with common configuration and methods for CommonGrants models."""

    model_config = ConfigDict(
        from_attributes=True,
        strict=True,
    )

    def dump(self) -> dict:
        """Convert model to dictionary (alias for model_dump for backward compatibility)."""
        return self.model_dump(mode="json")

    def dump_json(self) -> str:
        """Convert model to JSON string (alias for model_dump_json for backward compatibility)."""
        return self.model_dump_json()

    def dump_with_mapping(self, mapping: dict) -> dict:
        """Convert model to dictionary with mapping."""
        return transform_from_mapping(self.model_dump(mode="json"), mapping)

    @classmethod
    def from_json(cls, json_str: str) -> Self:
        """Create model instance from JSON string (alias for model_validate_json for backward compatibility)."""
        return cls.model_validate_json(json_str)

    @classmethod
    def from_dict(cls, data: dict) -> Self:
        """Create model instance from dictionary (alias for model_validate for backward compatibility)."""
        # If the data already contains datetime objects, use model_validate directly
        try:
            return cls.model_validate(data)
        except Exception:
            # If that fails, try converting to JSON and back
            json_str = json.dumps(
                data, default=str
            )  # Use str for non-serializable objects
            return cls.model_validate_json(json_str)

    @classmethod
    def validate_with_mapping(cls, data: dict, mapping: dict) -> Self:
        """Validate model with mapping."""
        new_data = transform_from_mapping(data, mapping)
        return cls.model_validate(new_data)
