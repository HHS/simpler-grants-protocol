"""Tests for build_transforms() in common_grants_sdk.extensions.transforms."""

from typing import Any

import pytest
from pydantic import BaseModel
from common_grants_sdk.extensions.transforms import build_transforms
from common_grants_sdk.extensions.types import PluginError, TransformResult


# Shared model fixtures for output-path validation tests
class _CommonModel(BaseModel):
    title: str
    status: dict[str, Any] | None = None


class _CommonModelWithCustomFields(BaseModel):
    title: str
    custom_fields: dict[str, Any] | None = None


# Shared source data matching the ADR-0017 grants.gov example
SOURCE_DATA = {
    "data": {
        "opportunity_title": "Research into conservation techniques",
        "opportunity_status": "posted",
        "summary": {
            "award_floor": 10000,
            "award_ceiling": 100000,
            "forecasted_post_date": "2025-05-01",
            "forecasted_close_date": "2025-07-15",
        },
    }
}

TO_COMMON_MAPPING = {
    "title": {"field": "data.opportunity_title"},
    "status": {
        "value": {
            "match": {
                "field": "data.opportunity_status",
                "case": {
                    "posted": "open",
                    "archived": "closed",
                    "forecasted": "forecasted",
                },
                "default": "custom",
            }
        },
        "description": "The opportunity is currently accepting applications",
    },
    "funding": {
        "minAwardAmount": {
            "amount": {"field": "data.summary.award_floor"},
            "currency": "USD",
        },
    },
}

FROM_COMMON_MAPPING = {
    "data": {
        "opportunity_title": {"field": "title"},
        "opportunity_status": {
            "match": {
                "field": "status.value",
                "case": {
                    "open": "posted",
                    "closed": "archived",
                    "forecasted": "forecasted",
                },
                "default": "custom",
            }
        },
        "summary": {
            "award_floor": {"field": "funding.minAwardAmount.amount"},
        },
    }
}


# --- Call-time validation ---


@pytest.mark.parametrize("name", ["field", "match", "switch"])
def test_handler_collision_raises(name):
    """build_transforms raises if custom handler shadows a default handler name."""
    with pytest.raises(ValueError, match="collide with defaults"):
        build_transforms(
            TO_COMMON_MAPPING,
            FROM_COMMON_MAPPING,
            handlers={name: lambda d, v: v},
        )


def test_structural_error_raises_with_path():
    """build_transforms raises on list nodes and includes the field path."""
    with pytest.raises(ValueError, match="Invalid mapping node"):
        build_transforms(
            {"title": ["should", "not", "be", "a", "list"]}, FROM_COMMON_MAPPING
        )
    with pytest.raises(ValueError, match="funding.amount"):
        build_transforms({"funding": {"amount": [1, 2]}}, {})


def test_handler_with_sibling_keys_raises():
    """build_transforms raises when a handler key has siblings in the same dict."""
    with pytest.raises(ValueError, match="sibling keys"):
        build_transforms({"title": {"field": "x", "extra": "literal"}}, {})
    # Nested occurrence is also caught, and the path is reported
    with pytest.raises(ValueError, match="nested.title"):
        build_transforms({"nested": {"title": {"field": "x", "extra": "literal"}}}, {})


# --- to_common transform ---


def test_to_common():
    to_common, _ = build_transforms(TO_COMMON_MAPPING, FROM_COMMON_MAPPING)
    result = to_common(SOURCE_DATA)
    assert isinstance(result, TransformResult)
    assert result.errors == []
    assert result.result["title"] == "Research into conservation techniques"
    assert result.result["status"]["value"] == "open"
    assert (
        result.result["status"]["description"]
        == "The opportunity is currently accepting applications"
    )
    assert result.result["funding"]["minAwardAmount"]["amount"] == 10000
    assert result.result["funding"]["minAwardAmount"]["currency"] == "USD"


# --- from_common roundtrip ---


def test_from_common_roundtrip():
    """Status roundtrip: posted → open → posted."""
    to_common, from_common = build_transforms(TO_COMMON_MAPPING, FROM_COMMON_MAPPING)
    native = from_common(to_common(SOURCE_DATA).result)
    assert isinstance(native, TransformResult)
    assert native.errors == []
    assert (
        native.result["data"]["opportunity_title"]
        == "Research into conservation techniques"
    )
    assert native.result["data"]["opportunity_status"] == "posted"


# --- Error surfacing ---


def test_exception_surfaces_as_plugin_error_not_raised():
    """Exceptions inside handlers surface as PluginError, not raised."""

    def boom(data, _arg):
        raise RuntimeError("handler exploded")

    to_common, _ = build_transforms(
        {"title": {"boom": "anything"}},
        {},
        handlers={"boom": boom},
    )
    result = to_common(SOURCE_DATA)
    assert len(result.errors) == 1
    err = result.errors[0]
    assert isinstance(err, PluginError)
    assert "handler exploded" in str(err)
    assert err.handler == "boom"
    assert isinstance(err.cause, RuntimeError)
    assert str(err.cause) == "handler exploded"


# --- model_validate via common_model ---


class _TitleModel(BaseModel):
    title: str


class _StrictModel(BaseModel):
    title: str
    required_field: str  # always missing from SOURCE_DATA transform output


def test_common_model_validates_result():
    """When common_model is provided, result is a model instance on success."""
    to_common, _ = build_transforms(
        {"title": {"field": "data.opportunity_title"}},
        {},
        common_model=_TitleModel,
    )
    result = to_common(SOURCE_DATA)
    assert result.errors == []
    assert isinstance(result.result, _TitleModel)
    assert result.result.title == "Research into conservation techniques"


def test_common_model_validation_failure():
    """ValidationError surfaces as PluginError entries; raw dict is still returned."""
    to_common, _ = build_transforms(
        {"title": {"field": "data.opportunity_title"}},
        {},
        common_model=_StrictModel,
    )
    result = to_common(SOURCE_DATA)
    assert len(result.errors) >= 1
    assert all(isinstance(e, PluginError) for e in result.errors)
    assert any("required_field" in (e.path or "") for e in result.errors)
    assert result.result["title"] == "Research into conservation techniques"


def test_common_model_non_validation_error_is_caught() -> None:
    """Non-ValidationError exceptions from model_validate surface as PluginError (errors-as-values contract)."""

    class _BrokenModel(BaseModel):
        title: str

        @classmethod
        def model_validate(cls, obj: Any, **kwargs: Any) -> "_BrokenModel":
            raise TypeError("misconfigured root validator")

    to_common, _ = build_transforms(
        {"title": {"field": "data.opportunity_title"}},
        {},
        common_model=_BrokenModel,
    )
    result = to_common(SOURCE_DATA)
    assert len(result.errors) == 1
    assert isinstance(result.errors[0], PluginError)
    assert "misconfigured root validator" in str(result.errors[0])
    # raw transformed dict is preserved so the caller can inspect it
    assert isinstance(result.result, dict)
    assert result.result["title"] == "Research into conservation techniques"


def test_custom_handler_registered_per_call():
    """Custom handlers apply only to the call they are registered on."""

    def handle_upper(data, path):
        parts = path.split(".")
        val = data
        for part in parts:
            val = val.get(part) if isinstance(val, dict) else None
        return str(val).upper() if val is not None else None

    to_common, _ = build_transforms(
        {"title": {"upper": "data.opportunity_title"}},
        {},
        handlers={"upper": handle_upper},
    )
    result = to_common(SOURCE_DATA)
    assert result.result["title"] == "RESEARCH INTO CONSERVATION TECHNIQUES"


# --- Output field-path validation (when common_model is provided) ---


def test_unknown_output_key_raises_when_model_provided():
    """build_transforms raises at call time if a to_common output key is not on the model."""
    with pytest.raises(ValueError, match="unknown_xyz"):
        build_transforms(
            {"title": {"field": "data.opportunity_title"}, "unknown_xyz": "literal"},
            {},
            common_model=_CommonModel,
        )


def test_custom_fields_key_is_valid_output_path():
    """custom_fields is accepted as a top-level output key when the model declares it."""
    to_common, _ = build_transforms(
        {
            "title": {"field": "data.opportunity_title"},
            "custom_fields": {"legacyId": {"field": "data.opportunity_title"}},
        },
        {},
        common_model=_CommonModelWithCustomFields,
    )
    result = to_common(SOURCE_DATA)
    assert result.errors == []
    assert isinstance(result.result, _CommonModelWithCustomFields)
    assert result.result.title == "Research into conservation techniques"
    assert (
        result.result.custom_fields["legacyId"]
        == "Research into conservation techniques"
    )


def test_output_path_validation_only_applies_to_to_common():
    """from_common output keys are not validated against common_model (they target native format)."""
    # from_common_mapping has keys that are NOT on _CommonModel — that's fine
    to_common, from_common = build_transforms(
        {"title": {"field": "data.opportunity_title"}},
        {"data": {"opportunity_title": {"field": "title"}}},
        common_model=_CommonModel,
    )
    result = from_common({"title": "hello"})
    assert result.errors == []
    assert result.result["data"]["opportunity_title"] == "hello"


def test_no_output_validation_without_common_model():
    """Without common_model, unknown output keys are allowed (no schema to validate against)."""
    to_common, _ = build_transforms(
        {"any_key_is_fine": {"field": "data.opportunity_title"}},
        {},
    )
    result = to_common(SOURCE_DATA)
    assert result.errors == []
    assert result.result["any_key_is_fine"] == "Research into conservation techniques"
