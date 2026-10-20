"""Shared field models that the award graph reuses, checked against Core v0.5.

Every case serializes with the documented wire recipe,
``model_dump(mode="json", by_alias=True, exclude_unset=True)``, so omitted optional
properties stay omitted and required ones must still appear.
"""

import json
from datetime import date, datetime, time, timedelta, timezone
from typing import Optional

import pytest
from pydantic import BaseModel, TypeAdapter, ValidationError, create_model

from common_grants_sdk.extensions import CustomFieldSet
from common_grants_sdk.schemas.pydantic import OpportunityBase
from common_grants_sdk.schemas.pydantic.fields import (
    CustomField,
    CustomFieldType,
    DateRangeEvent,
    Event,
    Money,
    OtherEvent,
    SingleDateEvent,
    SystemMetadata,
)


def wire(model: BaseModel) -> dict:
    return model.model_dump(mode="json", by_alias=True, exclude_unset=True)


EVENT = TypeAdapter(Event)


# ############################################################
# Event discriminator
# ############################################################


@pytest.mark.parametrize(
    ("event", "event_type"),
    [
        (SingleDateEvent(name="Posted", date=date(2026, 1, 1)), "singleDate"),
        (
            DateRangeEvent(
                name="Performance",
                start_date=date(2026, 1, 1),
                end_date=date(2026, 12, 31),
            ),
            "dateRange",
        ),
        (OtherEvent(name="Info sessions"), "other"),
    ],
)
def test_constructor_default_event_type_is_emitted(event, event_type):
    assert wire(event)["eventType"] == event_type


@pytest.mark.parametrize(
    ("payload", "model"),
    [
        ({"name": "Posted", "date": "2026-01-01"}, SingleDateEvent),
        (
            {"name": "Performance", "startDate": "2026-01-01", "endDate": "2026-12-31"},
            DateRangeEvent,
        ),
        ({"name": "Info sessions", "details": "Tuesdays"}, OtherEvent),
    ],
)
def test_missing_wire_discriminator_is_inferred_and_emitted(payload, model):
    """A payload without ``eventType`` parses (constructor convenience) and the
    inferred discriminator is written back, so the output is wire-valid."""
    event = EVENT.validate_python(payload)

    assert isinstance(event, model)
    assert wire(event) == {**payload, "eventType": event.event_type.value}


def test_wrong_discriminator_is_rejected():
    with pytest.raises(ValidationError):
        SingleDateEvent.model_validate(
            {"name": "Posted", "eventType": "other", "date": "2026-01-01"}
        )
    with pytest.raises(ValidationError):
        EVENT.validate_python({"name": "Posted", "eventType": "nope"})


# ############################################################
# Event optional metadata: omittable, never null
# ############################################################

SINGLE = {"name": "Posted", "eventType": "singleDate", "date": "2026-01-01"}
RANGE = {
    "name": "Performance",
    "eventType": "dateRange",
    "startDate": "2026-01-01",
    "endDate": "2026-12-31",
}
OTHER = {"name": "Info sessions", "eventType": "other"}

NULLABLE_EVENT_METADATA = [
    (SINGLE, "description", "description"),
    (SINGLE, "time", "time"),
    (RANGE, "startTime", "start_time"),
    (RANGE, "endTime", "end_time"),
    (OTHER, "details", "details"),
    (OTHER, "description", "description"),
]


@pytest.mark.parametrize(("base", "alias", "attr"), NULLABLE_EVENT_METADATA)
def test_explicit_null_event_metadata_reads_as_omitted(base, alias, attr):
    """Like the TS SDK, an event accepts null here; no dump writes it back."""
    model = type(EVENT.validate_python(base))
    for event in (
        EVENT.validate_python({**base, alias: None}),
        EVENT.validate_json(json.dumps({**base, alias: None})),
        model.model_validate({**base, attr: None}),  # snake_case key
        model(**{**base, attr: None}),  # native construction
    ):
        assert getattr(event, attr) is None
        assert wire(event) == base
        assert event.model_dump(mode="json", by_alias=True) == base


@pytest.mark.parametrize(("base", "alias", "attr"), NULLABLE_EVENT_METADATA)
def test_absent_event_metadata_stays_omitted(base, alias, attr):
    event = EVENT.validate_python(base)

    assert getattr(event, attr) is None
    assert alias not in wire(event)
    assert wire(event) == base


def test_empty_event_name_is_allowed():
    """Core ``EventBase.name`` is a plain string, with no minimum length."""
    assert wire(OtherEvent(name="")) == {"name": "", "eventType": "other"}


# ############################################################
# CustomField
# ############################################################

ENVELOPE = {"name": "scholarshipYear", "fieldType": "integer", "value": 2026}
NULLABLE_VALUE_FIELDS = {
    "bare": CustomField,
    "explicitly nullable": CustomField[Optional[int]],
    "runtime helper": create_model(
        "HelperYearField", __base__=CustomField, value=(Optional[int], None)
    ),
}


@pytest.mark.parametrize(
    "model", NULLABLE_VALUE_FIELDS.values(), ids=NULLABLE_VALUE_FIELDS.keys()
)
def test_required_custom_value_keeps_null(model):
    field = model.model_validate({**ENVELOPE, "value": None})

    assert field.value is None
    assert wire(field) == {**ENVELOPE, "value": None}


def test_typed_custom_value_rejects_null():
    with pytest.raises(ValidationError):
        CustomField[int].model_validate({**ENVELOPE, "value": None})


@pytest.mark.parametrize("model", [CustomField, CustomField[int]])
@pytest.mark.parametrize(
    ("alias", "attr"), [("schema", "schema_url"), ("description", "description")]
)
def test_explicit_null_custom_field_metadata_reads_as_omitted(model, alias, attr):
    """Like the TS SDK, ``schema`` and ``description`` accept null; dumps omit it."""
    for field in (
        model.model_validate({**ENVELOPE, alias: None}),
        model.model_validate({**ENVELOPE, attr: None}),
        model(
            name="scholarshipYear",
            field_type=CustomFieldType.INTEGER,
            value=2026,
            **{attr: None},
        ),
    ):
        assert getattr(field, attr) is None
        assert field.model_dump(mode="json", by_alias=True) == ENVELOPE


def test_empty_custom_field_name_is_allowed():
    """Core ``CustomField.name`` is a plain string, with no minimum length."""
    assert CustomField.model_validate({**ENVELOPE, "name": ""}).name == ""


@pytest.mark.parametrize(
    "uri",
    [
        "https://example.com/schemas/year.json",
        "http://example.com/schema",
        "ftp://example.com/schema.json",
        "urn:example:schema:year",
        "mailto:schemas@example.com",
    ],
)
def test_custom_field_schema_accepts_absolute_uris(uri):
    field = CustomField.model_validate({**ENVELOPE, "schema": uri})

    assert wire(field)["schema"].startswith(uri.split(":", 1)[0] + ":")


@pytest.mark.parametrize(
    "uri", ["not-a-url", "/relative/schema.json", "", "schema.json"]
)
def test_custom_field_schema_rejects_relative_or_invalid_uris(uri):
    with pytest.raises(ValidationError):
        CustomField.model_validate({**ENVELOPE, "schema": uri})


# ############################################################
# decimalString: emitted pattern ^-?[0-9]+\.?[0-9]*$
# ############################################################


@pytest.mark.parametrize(
    "amount", ["0", "100", "-100", "100.50", "-0.5", "1000000.00", "1.", "-1."]
)
def test_decimal_string_accepts_emitted_pattern(amount):
    assert wire(Money(amount=amount, currency="USD"))["amount"] == amount


@pytest.mark.parametrize(
    "amount",
    [
        ".5",  # Core requires a leading digit
        "-.5",
        "+1",
        "1e2",
        "1,000",
        "12.34.56",
        "",
        "-",
        "١٢",  # Arabic-Indic digits: Python's \d would accept these
        "１.２",  # full-width digits
    ],
)
def test_decimal_string_rejects_values_outside_emitted_pattern(amount):
    with pytest.raises(ValidationError):
        Money(amount=amount, currency="USD")


# ############################################################
# UTCDateTime metadata and ISOTime plain clock times
# ############################################################


@pytest.mark.parametrize(
    ("given", "expected"),
    [
        ("2026-03-01T00:00:00Z", "2026-03-01T00:00:00Z"),
        ("2026-03-01T05:30:00+05:30", "2026-03-01T00:00:00Z"),
        ("2026-02-28T19:00:00-05:00", "2026-03-01T00:00:00Z"),
        (datetime(2026, 3, 1, tzinfo=timezone.utc), "2026-03-01T00:00:00Z"),
        ("2026-03-01T00:00:00.5Z", "2026-03-01T00:00:00.500000Z"),
    ],
)
def test_metadata_timestamps_are_normalized_to_utc(given, expected):
    meta = SystemMetadata.model_validate({"createdAt": given, "lastModifiedAt": given})

    assert meta.created_at.utcoffset() == timedelta(0)
    assert wire(meta) == {"createdAt": expected, "lastModifiedAt": expected}


@pytest.mark.parametrize(
    "given",
    ["2026-03-01T00:00:00", datetime(2026, 3, 1), "2026-03-01", date(2026, 3, 1)],
)
def test_metadata_timestamps_require_a_timezone(given):
    """A naive or date-only value has no instant; the SDK will not guess a zone."""
    with pytest.raises(ValidationError):
        SystemMetadata.model_validate({"createdAt": given, "lastModifiedAt": given})


@pytest.mark.parametrize(
    ("given", "expected"),
    [
        ("14:30:00", "14:30:00"),
        (time(14, 30), "14:30:00"),
        ("14:30:00.25", "14:30:00.250000"),
    ],
)
def test_iso_time_is_a_plain_clock_time(given, expected):
    event = SingleDateEvent.model_validate({**SINGLE, "time": given})

    assert event.time is not None and event.time.tzinfo is None
    assert wire(event)["time"] == expected


@pytest.mark.parametrize(
    "given",
    ["14:30:00Z", "14:30:00+05:00", time(14, 30, tzinfo=timezone.utc)],
)
def test_iso_time_rejects_offsets_rather_than_dropping_them(given):
    with pytest.raises(ValidationError):
        SingleDateEvent.model_validate({**SINGLE, "time": given})


# ############################################################
# Closed (sealed) Core objects reject unknown properties
# ############################################################

OPP = {
    "id": "573525f2-8e15-4405-83fb-e6523511d893",
    "title": "Community Health Grant",
    "status": {"value": "open"},
    "description": "Funding for community health projects",
    "createdAt": "2026-01-01T00:00:00Z",
    "lastModifiedAt": "2026-01-01T00:00:00Z",
}
MONEY = {"amount": "100.00", "currency": "USD"}


@pytest.mark.parametrize(
    ("model", "payload"),
    [
        (SingleDateEvent, SINGLE),
        (DateRangeEvent, RANGE),
        (OtherEvent, OTHER),
        (CustomField, ENVELOPE),
        (Money, MONEY),
        (
            SystemMetadata,
            {"createdAt": OPP["createdAt"], "lastModifiedAt": OPP["createdAt"]},
        ),
    ],
)
def test_closed_shared_objects_reject_unknown_properties(model, payload):
    model.model_validate(payload)
    with pytest.raises(ValidationError) as exc_info:
        model.model_validate({**payload, "unknownProperty": 1})
    assert exc_info.value.errors()[0]["type"] == "extra_forbidden"


@pytest.mark.parametrize(
    ("path", "payload"),
    [
        (
            ("keyDates", "closeDate"),
            {**OPP, "keyDates": {"closeDate": {**SINGLE, "unknownProperty": 1}}},
        ),
        (
            ("keyDates", "otherDates", "review"),
            {"keyDates": {"otherDates": {"review": {**OTHER, "unknownProperty": 1}}}},
        ),
        (
            ("funding", "maxAwardAmount"),
            {"funding": {"maxAwardAmount": {**MONEY, "unknownProperty": 1}}},
        ),
        (
            ("customFields", "vendorKey"),
            {"customFields": {"vendorKey": {**ENVELOPE, "unknownProperty": 1}}},
        ),
    ],
)
def test_unknown_properties_are_rejected_at_nested_depths(path, payload):
    with pytest.raises(ValidationError) as exc_info:
        OpportunityBase.model_validate({**OPP, **payload})

    assert any(
        err["type"] == "extra_forbidden" and err["loc"][: len(path)] == path
        for err in exc_info.value.errors()
    )


def test_opportunity_base_stays_open_despite_closed_metadata():
    """Closing ``SystemMetadata`` must not close the models that spread it."""
    opp = OpportunityBase.model_validate({**OPP, "unknownProperty": 1})

    assert "unknownProperty" not in wire(opp)


def test_custom_field_maps_stay_open():
    class Fields(CustomFieldSet):
        known: Optional[CustomField[int]] = None

    opp = OpportunityBase[Fields].model_validate(
        {**OPP, "customFields": {"vendorKey": ENVELOPE, "known": ENVELOPE}}
    )

    assert wire(opp)["customFields"] == {"vendorKey": ENVELOPE, "known": ENVELOPE}
