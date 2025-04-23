"""Tests for the base model functionality."""

import json
from datetime import datetime, UTC

import pytest
from pydantic import BaseModel

from common_grants.schemas.base import CommonGrantsBaseModel


class SampleModel(CommonGrantsBaseModel):
    """Sample model for base model testing."""
    field1: str
    field2: int
    field3: datetime


def test_common_grants_base_model_serialization():
    """Test base model serialization methods."""
    now = datetime.now(UTC)
    model = SampleModel(
        field1="test",
        field2=123,
        field3=now
    )
    
    # Test dump()
    data = model.dump()
    assert isinstance(data, dict)
    assert data["field1"] == "test"
    assert data["field2"] == 123
    assert datetime.fromisoformat(data["field3"].replace("Z", "+00:00")) == now
    
    # Test dump_json()
    json_str = model.dump_json()
    assert isinstance(json_str, str)
    data = json.loads(json_str)
    assert data["field1"] == "test"
    assert data["field2"] == 123
    assert datetime.fromisoformat(data["field3"].replace("Z", "+00:00")) == now
    
    # Test from_json()
    loaded = SampleModel.from_json(json_str)
    assert loaded.field1 == "test"
    assert loaded.field2 == 123
    assert loaded.field3 == now
    
    # Test from_dict()
    # Convert datetime string to datetime object before validation
    data["field3"] = datetime.fromisoformat(data["field3"].replace("Z", "+00:00"))
    loaded = SampleModel.from_dict(data)
    assert loaded.field1 == "test"
    assert loaded.field2 == 123
    assert loaded.field3 == now


def test_model_config():
    """Test model configuration."""
    class AttrClass:
        def __init__(self):
            self.field1 = "test"
            self.field2 = 123
            self.field3 = datetime.now(UTC)
    
    # Test from_attributes config
    attr_instance = AttrClass()
    model = SampleModel.model_validate(attr_instance)
    assert model.field1 == "test"
    assert model.field2 == 123
    assert isinstance(model.field3, datetime)


def test_model_validation():
    """Test model validation."""
    # Valid case
    model = SampleModel(
        field1="test",
        field2=123,
        field3=datetime.now(UTC)
    )
    assert model.field1 == "test"
    assert model.field2 == 123
    
    # Invalid cases
    with pytest.raises(ValueError):
        SampleModel(
            field1=123,  # Wrong type
            field2=123,
            field3=datetime.now(UTC)
        )
    
    with pytest.raises(ValueError):
        SampleModel(
            field1="test",
            field2="123",  # Wrong type
            field3=datetime.now(UTC)
        )
    
    with pytest.raises(ValueError):
        SampleModel(
            field1="test",
            field2=123,
            field3="2024-01-01"  # Wrong type
        ) 