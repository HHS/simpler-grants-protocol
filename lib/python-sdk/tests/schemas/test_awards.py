"""Award models, checked against the emitted Core v0.5 award schemas."""

import copy
from typing import Any
from uuid import UUID

import pytest
from pydantic import ValidationError

from common_grants_sdk.extensions import CustomField
from common_grants_sdk.schemas import (
    AppRef,
    AwardBase,
    AwdIdFain,
    AwdIds,
    AwdRecipientIndividual,
    AwdRef,
    AwdStatus,
    AwdStatusOptions,
    AwdTimeline,
    DateRangeEvent,
    IdentifierCollection,
    Name,
    OppRef,
    OrgRefCollection,
    OtherEvent,
    SingleDateEvent,
)

from .award_fixtures import (
    AWARDS,
    FULL_AWARD,
    INDIVIDUAL_ONLY_AWARD,
    MINIMAL_AWARD,
    RECIPIENT_INDIVIDUAL,
    RecipientFields,
    TypedAward,
    wire,
)


def _with(payload: dict[str, Any], path: tuple[str, ...], value: Any) -> dict:
    out = copy.deepcopy(payload)
    target = out
    for key in path[:-1]:
        target = target[key]
    target[path[-1]] = value
    return out


def _without(payload: dict[str, Any], path: tuple[str, ...]) -> dict:
    out = copy.deepcopy(payload)
    target = out
    for key in path[:-1]:
        target = target[key]
    del target[path[-1]]
    return out


# ############################################################
# Round trips: camelCase, exact keys, omission preserved
# ############################################################


@pytest.mark.parametrize("model", [AwardBase, TypedAward], ids=["bare", "typed"])
@pytest.mark.parametrize("payload", AWARDS.values(), ids=AWARDS.keys())
def test_award_fixtures_round_trip_unchanged(model, payload):
    award = model.model_validate(payload)

    assert wire(award) == payload
    assert (
        model.model_validate_json(
            award.model_dump_json(by_alias=True, exclude_unset=True)
        )
        == award
    )


def test_full_award_parses_into_the_shared_models():
    award = AwardBase.model_validate(FULL_AWARD)

    assert award.id == UUID(FULL_AWARD["id"])
    assert isinstance(award.status, AwdStatus)
    assert award.status.value is AwdStatusOptions.CUSTOM
    assert award.status.custom_value == "suspended"
    assert isinstance(award.identifiers, AwdIds)
    assert isinstance(award.identifiers.awd_us_fain, AwdIdFain)
    assert award.identifiers.awd_us_fain.id == "H80CS00001"
    assert isinstance(award.key_dates, AwdTimeline)
    assert isinstance(award.key_dates.award_date, SingleDateEvent)
    assert isinstance(award.key_dates.period_of_performance, DateRangeEvent)
    assert award.key_dates.other_dates is not None
    assert isinstance(award.key_dates.other_dates["reportingCadence"], OtherEvent)
    assert isinstance(award.opportunity, OppRef)
    assert isinstance(award.application, AppRef)
    assert isinstance(award.funders, OrgRefCollection)
    assert isinstance(award.parent, AwdRef)
    assert award.funding is not None and award.funding.disbursed_amount is not None
    assert award.funding.disbursed_amount.amount == "150000."
    assert str(award.source) == FULL_AWARD["source"]


def test_minimal_award_leaves_optional_properties_unset():
    award = AwardBase.model_validate(MINIMAL_AWARD)

    assert award.recipient_individual is None
    assert award.funding is None
    assert wire(award) == MINIMAL_AWARD


def test_award_built_in_python_serializes_to_camel_case():
    award = AwardBase(
        id=UUID(MINIMAL_AWARD["id"]),
        title="Grant",
        description="About",
        status=AwdStatus(value=AwdStatusOptions.AWARDED),
        created_at=MINIMAL_AWARD["createdAt"],
        last_modified_at=MINIMAL_AWARD["lastModifiedAt"],
        key_dates=AwdTimeline(
            award_date=SingleDateEvent(name="Awarded", date="2026-03-01")
        ),
        recipient_individual=AwdRecipientIndividual(
            name=Name(first_name="Ada", last_name="Lovelace")
        ),
    )

    assert wire(award) == {
        **MINIMAL_AWARD,
        "title": "Grant",
        "description": "About",
        "keyDates": {
            "awardDate": {
                "name": "Awarded",
                "eventType": "singleDate",
                "date": "2026-03-01",
            }
        },
        "recipientIndividual": {"name": {"firstName": "Ada", "lastName": "Lovelace"}},
    }


# ############################################################
# Recipient custom fields: untyped default and typed container
# ############################################################


def test_bare_recipient_custom_fields_are_a_plain_custom_field_map():
    award = AwardBase.model_validate(INDIVIDUAL_ONLY_AWARD)
    recipient = award.recipient_individual

    assert recipient is not None and recipient.custom_fields is not None
    assert isinstance(recipient.custom_fields, dict)
    assert set(recipient.custom_fields) == set(RECIPIENT_INDIVIDUAL["customFields"])
    assert all(isinstance(v, CustomField) for v in recipient.custom_fields.values())
    assert recipient.custom_fields["scholarshipYear"].value == 2026
    assert recipient.custom_fields["mentorNote"].value is None


def test_typed_recipient_custom_fields_have_typed_values_and_keep_unknown_entries():
    award = TypedAward.model_validate(INDIVIDUAL_ONLY_AWARD)
    recipient = award.recipient_individual

    assert recipient is not None
    fields = recipient.custom_fields
    assert isinstance(fields, RecipientFields)
    assert fields.scholarship_year is not None
    assert fields.scholarship_year.value == 2026
    assert type(fields.scholarship_year.value) is int
    assert fields.model_extra is not None
    assert set(fields.model_extra) == {"mentorNote", "vendor_payload"}
    assert all(isinstance(v, CustomField) for v in fields.model_extra.values())
    assert wire(award) == INDIVIDUAL_ONLY_AWARD


def test_typed_recipient_rejects_a_wrongly_typed_registered_value():
    payload = _with(
        INDIVIDUAL_ONLY_AWARD,
        ("recipientIndividual", "customFields", "scholarshipYear", "value"),
        "twenty",
    )

    AwardBase.model_validate(payload)  # untyped: any value
    with pytest.raises(ValidationError) as exc_info:
        TypedAward.model_validate(payload)
    assert exc_info.value.errors()[0]["loc"][:3] == (
        "recipientIndividual",
        "customFields",
        "scholarshipYear",
    )


@pytest.mark.parametrize("model", [AwardBase, TypedAward], ids=["bare", "typed"])
@pytest.mark.parametrize(
    "entry",
    [
        None,
        {"name": "x", "value": 1},
        {"name": "x", "fieldType": "integer", "value": 1, "extra": True},
    ],
)
def test_malformed_recipient_custom_field_entries_are_rejected(model, entry):
    for key in ("scholarshipYear", "unknownKey"):
        payload = _with(
            INDIVIDUAL_ONLY_AWARD, ("recipientIndividual", "customFields", key), entry
        )
        with pytest.raises(ValidationError):
            model.model_validate(payload)


@pytest.mark.parametrize("model", [AwardBase, TypedAward], ids=["bare", "typed"])
def test_award_root_has_no_custom_fields(model):
    assert "custom_fields" not in model.model_fields
    with pytest.raises(ValidationError) as exc_info:
        model.model_validate(
            {**MINIMAL_AWARD, "customFields": RECIPIENT_INDIVIDUAL["customFields"]}
        )
    assert exc_info.value.errors()[0]["type"] == "extra_forbidden"


def test_recipient_identifiers_use_the_open_generic_collection():
    award = AwardBase.model_validate(INDIVIDUAL_ONLY_AWARD)

    assert award.recipient_individual is not None
    assert type(award.recipient_individual.identifiers) is IdentifierCollection


# ############################################################
# Optional is not nullable; required stays required
# ############################################################

NULL_PATHS = [
    ("identifiers",),
    ("funding",),
    ("keyDates",),
    ("opportunity",),
    ("application",),
    ("funders",),
    ("recipientOrganizations",),
    ("recipientIndividual",),
    ("parent",),
    ("source",),
    ("status", "customValue"),
    ("funding", "details"),
    ("funding", "awardedAmount"),
    ("keyDates", "otherDates"),
    ("recipientIndividual", "name"),
    ("recipientIndividual", "identifiers"),
    ("recipientIndividual", "customFields"),
    ("recipientIndividual", "name", "middleName"),
    ("recipientOrganizations", "otherOrgs"),
    ("identifiers", "awd:us:fain"),
    ("identifiers", "awd:us:fain", "registry", "url"),
    ("parent", "identifiers"),
]


@pytest.mark.parametrize("model", [AwardBase, TypedAward], ids=["bare", "typed"])
@pytest.mark.parametrize("path", NULL_PATHS, ids=[".".join(p) for p in NULL_PATHS])
def test_explicit_null_optional_properties_are_rejected(model, path):
    payload = _with(
        {
            **FULL_AWARD,
            "recipientIndividual": {
                **RECIPIENT_INDIVIDUAL,
                "name": {"firstName": "Ada", "middleName": "A", "lastName": "Lovelace"},
            },
        },
        path,
        None,
    )

    with pytest.raises(ValidationError) as exc_info:
        model.model_validate(payload)
    # Event union errors add the member name (``SingleDateEvent``) to the location.
    assert any(
        err["loc"][: len(path) - 1] == path[:-1] and err["loc"][-1] == path[-1]
        for err in exc_info.value.errors()
    )


@pytest.mark.parametrize(
    "field", ["id", "title", "description", "status", "createdAt", "lastModifiedAt"]
)
def test_required_award_fields(field):
    with pytest.raises(ValidationError):
        AwardBase.model_validate(_without(MINIMAL_AWARD, (field,)))


@pytest.mark.parametrize(
    ("path", "value"),
    [
        (("application",), {"id": MINIMAL_AWARD["id"]}),
        (("application",), {"id": MINIMAL_AWARD["id"], "name": "legacy"}),
        (("parent",), {"title": "Original award"}),
        (("parent", "id"), "not-a-uuid"),
        (
            ("opportunity", "identifiers", "opp:us:fon", "registry", "code"),
            "opp:us:aln",
        ),
        (("funders",), {"otherOrgs": {}}),
        (
            ("recipientOrganizations", "primary", "identifiers", "org:us:ein", "id"),
            "12-3456789",
        ),
        (("recipientIndividual", "name"), {"firstName": "Ada"}),
        (("status", "value"), "pending"),
        (("identifiers", "awd:us:fain", "registry", "code"), "awd:us:other"),
        (("keyDates", "awardDate", "eventType"), "dateRange"),
        (("funding", "awardedAmount", "amount"), ".5"),
        (("source",), "/award/1"),
        (("createdAt",), "2026-03-01T00:00:00"),
        (("keyDates", "awardDate", "time"), "14:30:00+05:00"),
    ],
)
def test_invalid_nested_values_are_rejected(path, value):
    with pytest.raises(ValidationError):
        AwardBase.model_validate(_with(FULL_AWARD, path, value))


@pytest.mark.parametrize(
    "path",
    [
        (),
        ("status",),
        ("funding",),
        ("keyDates",),
        ("opportunity",),
        ("application",),
        ("funders",),
        ("funders", "primary"),
        ("recipientIndividual",),
        ("recipientIndividual", "name"),
        ("parent",),
        ("identifiers",),
        ("identifiers", "awd:us:fain"),
        ("identifiers", "awd:us:fain", "registry"),
    ],
)
def test_award_objects_are_closed(path):
    payload = copy.deepcopy(FULL_AWARD)
    target = payload
    for key in path:
        target = target[key]
    target["unknownProperty"] = 1

    with pytest.raises(ValidationError) as exc_info:
        AwardBase.model_validate(payload)
    assert any(
        err["type"] == "extra_forbidden" and err["loc"] == (*path, "unknownProperty")
        for err in exc_info.value.errors()
    )


def test_open_records_keep_arbitrary_keys():
    award = AwardBase.model_validate(FULL_AWARD)

    assert award.key_dates is not None and award.key_dates.other_dates is not None
    assert set(award.key_dates.other_dates) == {"reportingCadence"}
    assert award.recipient_organizations is not None
    assert award.recipient_organizations.other_orgs is not None
    assert set(award.recipient_organizations.other_orgs) == {"fiscalAgent"}
    assert award.identifiers is not None and award.identifiers.other_ids is not None
    assert set(award.identifiers.other_ids) == {"awd:usaspending:id"}


def test_award_status_options():
    assert [o.value for o in AwdStatusOptions] == [
        "awarded",
        "completed",
        "cancelled",
        "custom",
    ]


def test_typed_awards_example_runs():
    from examples.typed_awards import main

    main()
