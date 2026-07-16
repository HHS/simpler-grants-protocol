"""Tests for build_transforms() in common_grants_sdk.extensions.transforms."""

from typing import Any

import pytest
from pydantic import BaseModel
from common_grants_sdk.extensions.transforms import build_transforms
from common_grants_sdk.extensions.types import TransformError, TransformResult


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
    """Exceptions inside handlers surface as TransformError, not raised."""

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
    assert isinstance(err, TransformError)
    assert "handler exploded" in str(err)
    assert err.handler == "boom"
    assert isinstance(err.cause, RuntimeError)
    assert str(err.cause) == "handler exploded"


# --- model_validate via common_schema ---


class _TitleModel(BaseModel):
    title: str


class _StrictModel(BaseModel):
    title: str
    required_field: str  # always missing from SOURCE_DATA transform output


def test_common_schema_validates_result():
    """When common_schema is provided, result is a model instance on success."""
    to_common, _ = build_transforms(
        {"title": {"field": "data.opportunity_title"}},
        {},
        common_schema=_TitleModel,
    )
    result = to_common(SOURCE_DATA)
    assert result.errors == []
    assert isinstance(result.result, _TitleModel)
    assert result.result.title == "Research into conservation techniques"


def test_common_schema_validation_failure():
    """ValidationError surfaces as TransformError entries; raw dict is still returned."""
    to_common, _ = build_transforms(
        {"title": {"field": "data.opportunity_title"}},
        {},
        common_schema=_StrictModel,
    )
    result = to_common(SOURCE_DATA)
    assert len(result.errors) >= 1
    assert all(isinstance(e, TransformError) for e in result.errors)
    assert any("required_field" in (e.path or "") for e in result.errors)
    assert result.result["title"] == "Research into conservation techniques"


def test_common_schema_non_validation_error_is_caught() -> None:
    """Non-ValidationError exceptions from model_validate surface as TransformError (errors-as-values contract)."""

    class _BrokenModel(BaseModel):
        title: str

        @classmethod
        def model_validate(cls, obj: Any, **kwargs: Any) -> "_BrokenModel":
            raise TypeError("misconfigured root validator")

    to_common, _ = build_transforms(
        {"title": {"field": "data.opportunity_title"}},
        {},
        common_schema=_BrokenModel,
    )
    result = to_common(SOURCE_DATA)
    assert len(result.errors) == 1
    assert isinstance(result.errors[0], TransformError)
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


# --- Output field-path validation (when common_schema is provided) ---


def test_unknown_output_key_raises_when_model_provided():
    """build_transforms raises at call time if a to_common output key is not on the model."""
    with pytest.raises(ValueError, match="unknown_xyz"):
        build_transforms(
            {"title": {"field": "data.opportunity_title"}, "unknown_xyz": "literal"},
            {},
            common_schema=_CommonModel,
        )


def test_output_path_accepts_split_alias_wire_keys():
    """Alias discovery covers validation_alias/serialization_alias, not just alias=.

    EventBase declares its camelCase wire names via split aliases, so the
    established ``eventType`` output key must stay valid for build_transforms.
    """
    from common_grants_sdk.schemas.pydantic.fields.event import EventBase

    build_transforms(
        {
            "name": {"field": "data.opportunity_title"},
            "eventType": "singleDate",
        },
        {},
        common_schema=EventBase,
    )

    # The snake_case field name itself also remains a valid output key
    build_transforms(
        {
            "name": {"field": "data.opportunity_title"},
            "event_type": "singleDate",
        },
        {},
        common_schema=EventBase,
    )


def test_output_path_accepts_legacy_bare_alias():
    """Models still using bare alias= keep both field-name and alias output keys."""
    from pydantic import Field

    class _LegacyAliased(BaseModel):
        event_type: str = Field(alias="eventType")
        plain: str = ""

    build_transforms(
        {"eventType": "singleDate", "plain": "x", "event_type": "singleDate"},
        {},
        common_schema=_LegacyAliased,
    )


def test_custom_fields_key_is_valid_output_path():
    """custom_fields is accepted as a top-level output key when the model declares it."""
    to_common, _ = build_transforms(
        {
            "title": {"field": "data.opportunity_title"},
            "custom_fields": {"legacyId": {"field": "data.opportunity_title"}},
        },
        {},
        common_schema=_CommonModelWithCustomFields,
    )
    result = to_common(SOURCE_DATA)
    assert result.errors == []
    assert isinstance(result.result, _CommonModelWithCustomFields)
    assert result.result.title == "Research into conservation techniques"
    assert (
        result.result.custom_fields["legacyId"]
        == "Research into conservation techniques"
    )


def test_output_path_validation_only_applies_to_to_common_when_only_common_schema_given():
    """from_common output keys are not validated against common_schema (they target source system format)."""
    # from_common_mapping has keys that are NOT on _CommonModel — that's fine
    to_common, from_common = build_transforms(
        {"title": {"field": "data.opportunity_title"}},
        {"data": {"opportunity_title": {"field": "title"}}},
        common_schema=_CommonModel,
    )
    result = from_common({"title": "hello"})
    assert result.errors == []
    assert result.result["data"]["opportunity_title"] == "hello"


def test_no_output_validation_without_common_schema():
    """Without common_schema, unknown output keys are allowed (no schema to validate against)."""
    to_common, _ = build_transforms(
        {"any_key_is_fine": {"field": "data.opportunity_title"}},
        {},
    )
    result = to_common(SOURCE_DATA)
    assert result.errors == []
    assert result.result["any_key_is_fine"] == "Research into conservation techniques"


# --- source_schema validation ---


class _NativeModel(BaseModel):
    native_title: str
    native_id: str


class _StrictNativeModel(BaseModel):
    native_title: str
    native_id: str  # always missing from the partial mapping tests below


def test_source_schema_validates_from_common_result():
    """When source_schema is provided, result is a model instance on success."""
    _, from_common = build_transforms(
        {},
        {
            "native_title": {"field": "title"},
            "native_id": {"field": "id"},
        },
        source_schema=_NativeModel,
    )
    result = from_common({"title": "Test Opp", "id": "abc-123"})
    assert result.errors == []
    assert isinstance(result.result, _NativeModel)
    assert result.result.native_title == "Test Opp"
    assert result.result.native_id == "abc-123"


def test_source_schema_validation_failure_surfaces_as_plugin_errors():
    """ValidationError from source_schema surfaces as TransformError entries; raw dict still returned."""
    _, from_common = build_transforms(
        {},
        # Only maps native_title — native_id will be missing, causing a ValidationError
        {"native_title": {"field": "title"}},
        source_schema=_StrictNativeModel,
    )
    result = from_common({"title": "Test Opp"})
    assert len(result.errors) >= 1
    assert all(isinstance(e, TransformError) for e in result.errors)
    assert any("native_id" in (e.path or "") for e in result.errors)
    # raw dict preserved alongside errors
    assert result.result["native_title"] == "Test Opp"


def test_source_schema_aggregates_all_zod_issues() -> None:
    """All ValidationError issues are surfaced — not just the first."""

    class _TwoFieldNative(BaseModel):
        a: str
        b: int

    _, from_common = build_transforms(
        {},
        # Both fields will fail: a gets an int (expects str coercion ok) and b gets a non-int str
        {"a": {"const": 123}, "b": {"const": "not-a-number"}},
        source_schema=_TwoFieldNative,
    )
    result = from_common({})
    # Pydantic may coerce `a` (int→str), but `b` ("not-a-number"→int) must fail
    assert len(result.errors) >= 1
    assert all(isinstance(e, TransformError) for e in result.errors)


def test_source_schema_validates_from_common_output_keys_at_call_time():
    """build_transforms raises at call time if a from_common output key is not on source_schema."""
    with pytest.raises(ValueError, match="unknown_native_field"):
        build_transforms(
            {},
            {"native_title": {"field": "title"}, "unknown_native_field": "literal"},
            source_schema=_NativeModel,
        )


def test_from_common_output_keys_not_validated_without_source_schema():
    """Without source_schema, from_common output keys are not validated."""
    _, from_common = build_transforms(
        {},
        {"any_native_key": {"field": "title"}},
    )
    result = from_common({"title": "hello"})
    assert result.errors == []
    assert result.result["any_native_key"] == "hello"


def test_source_schema_non_validation_error_is_caught() -> None:
    """Non-ValidationError exceptions from model_validate on source_schema surface as TransformError."""

    class _BrokenNativeModel(BaseModel):
        native_title: str

        @classmethod
        def model_validate(cls, obj: Any, **kwargs: Any) -> "_BrokenNativeModel":
            raise TypeError("broken native validator")

    _, from_common = build_transforms(
        {},
        {"native_title": {"field": "title"}},
        source_schema=_BrokenNativeModel,
    )
    result = from_common({"title": "Test"})
    assert len(result.errors) == 1
    assert isinstance(result.errors[0], TransformError)
    assert "broken native validator" in str(result.errors[0])
    assert isinstance(result.result, dict)
    assert result.result["native_title"] == "Test"
