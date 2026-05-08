"""Tests for build_transforms() in common_grants_sdk.extensions.transforms."""

import pytest
from pydantic import BaseModel
from common_grants_sdk.extensions.transforms import build_transforms
from common_grants_sdk.extensions.types import PluginError, TransformResult

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
            "switch": {
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
            "switch": {
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


def test_handler_collision_raises():
    """build_transforms raises if custom handler shadows a default handler name."""
    with pytest.raises(ValueError, match="collide with defaults"):
        build_transforms(
            TO_COMMON_MAPPING,
            FROM_COMMON_MAPPING,
            handlers={"field": lambda d, v: v},  # "field" is a default handler
        )


def test_handler_collision_raises_for_switch():
    with pytest.raises(ValueError, match="collide with defaults"):
        build_transforms(
            TO_COMMON_MAPPING,
            FROM_COMMON_MAPPING,
            handlers={"switch": lambda d, v: v},
        )


def test_structural_error_list_node_raises():
    """build_transforms raises if a mapping node is a list (structural malformation)."""
    bad_mapping = {"title": ["should", "not", "be", "a", "list"]}
    with pytest.raises(ValueError, match="Invalid mapping node"):
        build_transforms(bad_mapping, FROM_COMMON_MAPPING)


def test_valid_mapping_does_not_raise():
    """build_transforms does not raise on a well-formed mapping."""
    to_common, from_common = build_transforms(TO_COMMON_MAPPING, FROM_COMMON_MAPPING)
    assert callable(to_common)
    assert callable(from_common)


# --- to_common transform ---


def test_to_common_returns_transform_result():
    to_common, _ = build_transforms(TO_COMMON_MAPPING, FROM_COMMON_MAPPING)
    result = to_common(SOURCE_DATA)
    assert isinstance(result, TransformResult)


def test_to_common_no_errors_on_valid_data():
    to_common, _ = build_transforms(TO_COMMON_MAPPING, FROM_COMMON_MAPPING)
    result = to_common(SOURCE_DATA)
    assert result.errors == []


def test_to_common_maps_title():
    to_common, _ = build_transforms(TO_COMMON_MAPPING, FROM_COMMON_MAPPING)
    result = to_common(SOURCE_DATA)
    assert result.result["title"] == "Research into conservation techniques"


def test_to_common_maps_status_via_switch():
    to_common, _ = build_transforms(TO_COMMON_MAPPING, FROM_COMMON_MAPPING)
    result = to_common(SOURCE_DATA)
    assert result.result["status"]["value"] == "open"


def test_to_common_preserves_literal_constant():
    to_common, _ = build_transforms(TO_COMMON_MAPPING, FROM_COMMON_MAPPING)
    result = to_common(SOURCE_DATA)
    assert (
        result.result["status"]["description"]
        == "The opportunity is currently accepting applications"
    )


def test_to_common_maps_nested_funding():
    to_common, _ = build_transforms(TO_COMMON_MAPPING, FROM_COMMON_MAPPING)
    result = to_common(SOURCE_DATA)
    assert result.result["funding"]["minAwardAmount"]["amount"] == 10000
    assert result.result["funding"]["minAwardAmount"]["currency"] == "USD"


# --- from_common transform ---


def test_from_common_returns_transform_result():
    to_common, from_common = build_transforms(TO_COMMON_MAPPING, FROM_COMMON_MAPPING)
    cg = to_common(SOURCE_DATA)
    result = from_common(cg.result)
    assert isinstance(result, TransformResult)


def test_from_common_no_errors_on_valid_data():
    to_common, from_common = build_transforms(TO_COMMON_MAPPING, FROM_COMMON_MAPPING)
    cg = to_common(SOURCE_DATA)
    result = from_common(cg.result)
    assert result.errors == []


def test_from_common_roundtrip_title():
    to_common, from_common = build_transforms(TO_COMMON_MAPPING, FROM_COMMON_MAPPING)
    cg = to_common(SOURCE_DATA)
    native = from_common(cg.result)
    assert (
        native.result["data"]["opportunity_title"]
        == "Research into conservation techniques"
    )


def test_from_common_roundtrip_status():
    """Status roundtrip: posted → open → posted."""
    to_common, from_common = build_transforms(TO_COMMON_MAPPING, FROM_COMMON_MAPPING)
    cg = to_common(SOURCE_DATA)
    native = from_common(cg.result)
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
    assert isinstance(result, TransformResult)
    assert len(result.errors) == 1
    assert isinstance(result.errors[0], PluginError)
    assert "handler exploded" in str(result.errors[0])


def test_structural_error_nested_list_path_reported():
    """_validate_mapping includes the field path in the error message for nested lists."""
    bad_mapping = {"funding": {"amount": [1, 2]}}
    with pytest.raises(ValueError, match="funding.amount"):
        build_transforms(bad_mapping, {})


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


def test_common_model_validation_failure_surfaces_as_plugin_errors():
    """ValidationError from model_validate surfaces as PluginError entries, not raised."""
    to_common, _ = build_transforms(
        {"title": {"field": "data.opportunity_title"}},
        {},
        common_model=_StrictModel,
    )
    result = to_common(SOURCE_DATA)
    assert len(result.errors) >= 1
    assert all(isinstance(e, PluginError) for e in result.errors)
    assert any("required_field" in (e.path or "") for e in result.errors)


def test_common_model_validation_failure_preserves_partial_result():
    """On validation failure, the raw transform result dict is still returned."""
    to_common, _ = build_transforms(
        {"title": {"field": "data.opportunity_title"}},
        {},
        common_model=_StrictModel,
    )
    result = to_common(SOURCE_DATA)
    assert result.result["title"] == "Research into conservation techniques"


def test_no_common_model_returns_dict():
    """Without common_model, result is a plain dict as before."""
    to_common, _ = build_transforms(
        {"title": {"field": "data.opportunity_title"}},
        {},
    )
    result = to_common(SOURCE_DATA)
    assert result.errors == []
    assert isinstance(result.result, dict)


def test_custom_handler_registered_per_call():
    """Custom handlers apply only to the call they are registered on."""

    def handle_upper(data, path):
        parts = path.split(".")
        val = data
        for part in parts:
            if isinstance(val, dict):
                val = val.get(part)
            else:
                val = None
                break
        return str(val).upper() if val is not None else None

    to_common, _ = build_transforms(
        {"title": {"upper": "data.opportunity_title"}},
        {},
        handlers={"upper": handle_upper},
    )
    result = to_common(SOURCE_DATA)
    assert result.result["title"] == "RESEARCH INTO CONSERVATION TECHNIQUES"
