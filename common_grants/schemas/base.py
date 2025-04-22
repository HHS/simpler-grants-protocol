from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Any
from datetime import datetime
from uuid import UUID

class CommonGrantsBaseModel(BaseModel):
    """Base model with common configuration and methods for CommonGrants models."""
    
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "json_encoders": {
                UUID: str,
                datetime: lambda dt: dt.isoformat()
            }
        }
    )
    
    def dump(self) -> dict:
        """Convert model to dictionary (alias for model_dump for backward compatibility)."""
        return self.model_dump()
    
    def dump_json(self) -> str:
        """Convert model to JSON string (alias for model_dump_json for backward compatibility)."""
        return self.model_dump_json()
    
    @classmethod
    def from_json(cls, json_str: str) -> "CommonGrantsBaseModel":
        """Create model instance from JSON string (alias for model_validate_json for backward compatibility)."""
        return cls.model_validate_json(json_str)
    
    @classmethod
    def from_dict(cls, data: dict) -> "CommonGrantsBaseModel":
        """Create model instance from dictionary (alias for model_validate for backward compatibility)."""
        return cls.model_validate(data) 