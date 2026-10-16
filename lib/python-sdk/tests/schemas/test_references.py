"""Shared reference models and Name, checked against the emitted Core v0.5 schemas."""

from uuid import UUID

import pytest
from pydantic import BaseModel, ValidationError

from common_grants_sdk.schemas.pydantic import (
    AppRef,
    Name,
    OppIds,
    OppRef,
    OrgIds,
    OrgRef,
    OrgRefCollection,
)


def wire(model: BaseModel) -> dict:
    return model.model_dump(mode="json", by_alias=True, exclude_unset=True)


APP_REF = {"id": "123e4567-e89b-12d3-a456-426614174000", "title": "My Application"}
OPP_REF = {
    "id": "018f2e77-3a4b-7c1d-9e2f-abcdef123456",
    "title": "Health Center Capital Improvement Program",
    "identifiers": {
        "opp:us:fon": {
            "registry": {
                "code": "opp:us:fon",
                "url": "https://commongrants.org/registries/opp-us-fon",
            },
            "id": "HHS-2026-ACF-OCC-YD-0001",
        }
    },
}
FUNDER = {
    "id": "018f2e77-4b5c-7d2e-9f3a-bcdef1234567",
    "name": "Health Resources and Services Administration",
    "identifiers": {
        "otherIds": {
            "org:grants.gov:agency": {
                "registry": {"code": "org:grants.gov:agency"},
                "id": "HRSA",
            }
        }
    },
}
RECIPIENT_ORG = {
    "id": "018f2e77-6d7e-7f4a-9b5c-def123456789",
    "name": "Riverside Community Health Center",
    "identifiers": {
        "org:us:ein": {"registry": {"code": "org:us:ein"}, "id": "582345679"}
    },
}


@pytest.mark.parametrize(
    ("model", "payload"),
    [
        (AppRef, APP_REF),
        (OppRef, OPP_REF),
        (OrgRef, FUNDER),
        (OrgRefCollection, {"primary": FUNDER}),
        (
            OrgRefCollection,
            {
                "primary": RECIPIENT_ORG,
                "otherOrgs": {"fiscal-agent": FUNDER, "co_recipient": RECIPIENT_ORG},
            },
        ),
        (Name, {"firstName": "Ada", "lastName": "Lovelace"}),
        (
            Name,
            {
                "prefix": "Dr.",
                "firstName": "Ada",
                "middleName": "Augusta",
                "lastName": "Lovelace",
                "suffix": "PhD",
            },
        ),
    ],
)
def test_references_round_trip_on_the_wire(model, payload):
    assert wire(model.model_validate(payload)) == payload


def test_references_reuse_the_shared_identifier_collections():
    opp = OppRef.model_validate(OPP_REF)
    org = OrgRef.model_validate(RECIPIENT_ORG)

    assert isinstance(opp.identifiers, OppIds)
    assert isinstance(org.identifiers, OrgIds)
    assert org.identifiers.org_us_ein is not None
    assert org.id == UUID(RECIPIENT_ORG["id"])


def test_other_orgs_is_an_open_record_with_exact_role_keys():
    orgs = OrgRefCollection.model_validate(
        {"primary": FUNDER, "otherOrgs": {"Fiscal Agent": FUNDER, "x:y": FUNDER}}
    )

    assert orgs.other_orgs is not None
    assert set(orgs.other_orgs) == {"Fiscal Agent", "x:y"}
    assert all(isinstance(org, OrgRef) for org in orgs.other_orgs.values())


@pytest.mark.parametrize(
    ("model", "payload"),
    [
        (AppRef, {"id": APP_REF["id"]}),  # title required
        (AppRef, {"id": APP_REF["id"], "name": "My Application"}),  # legacy `name`
        (AppRef, {"id": "not-a-uuid", "title": "x"}),
        (OppRef, {"id": OPP_REF["id"]}),
        (OrgRef, {"id": FUNDER["id"], "title": "x"}),  # OrgRef uses `name`
        (OrgRefCollection, {}),  # primary required
        (
            OrgRefCollection,
            {"primary": FUNDER, "otherOrgs": {"agent": {"id": FUNDER["id"]}}},
        ),
        (Name, {"firstName": "Ada"}),
        (Name, {"lastName": "Lovelace"}),
    ],
)
def test_required_reference_fields_are_enforced(model, payload):
    with pytest.raises(ValidationError):
        model.model_validate(payload)


@pytest.mark.parametrize(
    ("model", "payload"),
    [
        (OppRef, {**OPP_REF, "identifiers": None}),
        (OrgRef, {**FUNDER, "identifiers": None}),
        (OrgRefCollection, {"primary": FUNDER, "otherOrgs": None}),
        (OrgRefCollection, {"primary": FUNDER, "otherOrgs": {"agent": None}}),
        (Name, {"firstName": "Ada", "lastName": "Lovelace", "middleName": None}),
        (Name, {"firstName": None, "lastName": "Lovelace"}),
    ],
)
def test_explicit_nulls_are_rejected(model, payload):
    with pytest.raises(ValidationError):
        model.model_validate(payload)


@pytest.mark.parametrize(
    ("model", "payload"),
    [
        (AppRef, APP_REF),
        (OppRef, OPP_REF),
        (OrgRef, FUNDER),
        (OrgRefCollection, {"primary": FUNDER}),
        (Name, {"firstName": "Ada", "lastName": "Lovelace"}),
    ],
)
def test_references_are_closed(model, payload):
    with pytest.raises(ValidationError):
        model.model_validate({**payload, "unknownProperty": 1})
