"""Tests for the base model functionality."""

import json
from datetime import datetime, UTC

import pytest

from common_grants_sdk.schemas.pydantic.base import CommonGrantsBaseModel


class SampleModel(CommonGrantsBaseModel):
    """Sample model for base model testing."""

    field1: str
    field2: int
    field3: datetime


class NestedModel(CommonGrantsBaseModel):
    """Nested model for base model testing."""

    field0: str
    nested_model: SampleModel


def test_common_grants_base_model_serialization():
    """Test base model serialization methods."""
    now = datetime.now(UTC)
    model = SampleModel(field1="test", field2=123, field3=now)

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
    model = SampleModel(field1="test", field2=123, field3=datetime.now(UTC))
    assert model.field1 == "test"
    assert model.field2 == 123

    # Invalid cases
    with pytest.raises(ValueError):
        SampleModel(field1=123, field2=123, field3=datetime.now(UTC))  # Wrong type

    with pytest.raises(ValueError):
        SampleModel(field1="test", field2="123", field3=datetime.now(UTC))  # Wrong type

    with pytest.raises(ValueError):
        SampleModel(field1="test", field2=123, field3="2024-01-01")  # Wrong type


class TestDumpWithMapping:
    """Test the dump_with_mapping() method."""

    def test_rename_fields(self):
        """Test the dump_with_mapping method with a flat mapping."""
        # arrange - create a sample model
        date = datetime(2024, 1, 1, 12, 0, 0, tzinfo=UTC)
        model = SampleModel(field1="test", field2=123, field3=date)
        # arrange - create a mapping
        mapping = {
            "field_0": {"field": "field1"},
            "field_1": {"field": "field2"},
            "field_2": {"field": "field3"},
        }
        # assert
        result = model.dump_with_mapping(mapping)
        assert result == {
            "field_0": "test",
            "field_1": 123,
            "field_2": date.strftime("%Y-%m-%dT%H:%M:%SZ"),
        }

    def test_flatten_nested_model(self):
        """Test the dump_with_mapping method with a nested model."""
        # arrange - create a sample model
        date = datetime(2024, 1, 1, 12, 0, 0, tzinfo=UTC)
        model = NestedModel(
            field0="test",
            nested_model=SampleModel(
                field1="test",
                field2=123,
                field3=date,
            ),
        )
        # arrange - create a mapping
        mapping = {
            "field_0": {"field": "field0"},
            "field_1": {"field": "nested_model.field1"},
            "field_2": {"field": "nested_model.field2"},
            "field_3": {"field": "nested_model.field3"},
        }
        # assert
        result = model.dump_with_mapping(mapping)
        assert result == {
            "field_0": "test",
            "field_1": "test",
            "field_2": 123,
            "field_3": date.strftime("%Y-%m-%dT%H:%M:%SZ"),
        }

    def test_reshape_nested_model(self):
        """Test the reshape_output method with a nested model."""
        # arrange - create a sample model
        date = datetime(2024, 1, 1, 12, 0, 0, tzinfo=UTC)
        model = NestedModel(
            field0="test",
            nested_model=SampleModel(
                field1="test",
                field2=123,
                field3=date,
            ),
        )
        # arrange - create a mapping
        mapping = {
            "group_1": {
                "field0": {"field": "field0"},
                "field1": {"field": "nested_model.field1"},
            },
            "group_2": {
                "field2": {"field": "nested_model.field2"},
                "field3": {"field": "nested_model.field3"},
                "description": "Constant description",
            },
        }
        # assert
        assert model.dump_with_mapping(mapping) == {
            "group_1": {
                "field0": "test",
                "field1": "test",
            },
            "group_2": {
                "field2": 123,
                "field3": date.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "description": "Constant description",
            },
        }


class TestValidateWithMapping:
    """Test the validate_with_mapping() method."""

    def test_validate_renamed_fields(self):
        """Test the validate_with_mapping() method with renamed fields."""
        # arrange - create a sample input
        date = datetime(2024, 1, 1, 1, tzinfo=UTC)
        data = {
            "field_0": "test",
            "field_1": 123,
            "field_2": date,
        }
        # arrange - create a mapping
        mapping = {
            "field1": {"field": "field_0"},
            "field2": {"field": "field_1"},
            "field3": {"field": "field_2"},
        }
        # act
        result = SampleModel.validate_with_mapping(data, mapping)
        # assert
        assert result.field1 == "test"
        assert result.field2 == 123
        assert result.field3 == date

    def test_validate_nested_model(self):
        """Test the validate_with_mapping() method with a nested model."""
        # arrange - create a sample input
        date = datetime(2024, 1, 1, 1, tzinfo=UTC)
        data = {
            "field0": "test",
            "field1": "test",
            "field2": 123,
            "field3": date,
        }
        # arrange - create a mapping
        mapping = {
            "field0": {"field": "field0"},
            "nested_model": {
                "field1": {"field": "field1"},
                "field2": {"field": "field2"},
                "field3": {"field": "field3"},
            },
        }
        # act
        result = NestedModel.validate_with_mapping(data, mapping)
        # assert
        assert result.field0 == "test"
        assert result.nested_model.field1 == "test"
        assert result.nested_model.field2 == 123

    def test_validate_reshaped_input(self):
        """Test the validate_with_mapping() after completely reshaping the input."""
        # arrange - create a sample input
        date = datetime(2024, 1, 1, 1, tzinfo=UTC)
        data = {
            "group_1": {
                "field0": "test",
                "field1": "test",
            },
            "group_2": {
                "field2": 123,
                "field3": date,
                "description": "Constant description",
            },
        }
        # arrange - create a mapping
        mapping = {
            "field0": {"field": "group_1.field0"},
            "nested_model": {
                "field1": {"field": "group_1.field1"},
                "field2": {"field": "group_2.field2"},
                "field3": {"field": "group_2.field3"},
            },
        }
        # act
        result = NestedModel.validate_with_mapping(data, mapping)
        # assert
        assert result.field0 == "test"
        assert result.nested_model.field1 == "test"
        assert result.nested_model.field2 == 123
        assert result.nested_model.field3 == date

    def test_raise_error_when_field_is_not_found(self):
        """The method should raise an error if a required field is missing."""
        # arrange - create a sample input
        data = {
            "field_1": "test",
            "field_2": "test",
            "field_3": "test",
        }
        # arrange - create a mapping
        mapping = {  # missing field3
            "field1": {"field": "field1"},
            "field2": {"field": "field2"},
        }
        # act
        with pytest.raises(ValueError):
            SampleModel.validate_with_mapping(data, mapping)
