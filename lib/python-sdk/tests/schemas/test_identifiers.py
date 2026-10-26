"""Shared identifier models, checked against the emitted Core v0.5 schemas."""

from uuid import UUID

import pytest
from pydantic import BaseModel, ValidationError

from common_grants_sdk.schemas.pydantic import (
    Identifier,
    IdentifierCollection,
    IdentifierStatus,
    OppIdAln,
    OppIdFon,
    OppIds,
    OrgIdDuns,
    OrgIdEin,
    OrgIds,
    OrgIdUei,
    SystemId,
)


def wire(model: BaseModel) -> dict:
    return model.model_dump(mode="json", by_alias=True, exclude_unset=True)


SYSTEM_ID = {
    "registry": {
        "code": "org:grants.gov:system",
        "url": "https://commongrants.org/registries/org-grants-gov-system",
    },
    "id": "01912a8b-7c3d-7890-abcd-ef1234567890",
}
EIN = {
    "registry": {
        "code": "org:us:ein",
        "url": "https://commongrants.org/registries/org-us-ein",
    },
    "id": "123456789",
    "allIds": [
        {"id": "123456789", "status": "active"},
        {"id": "987654321", "status": "archived"},
    ],
}
ORG_IDS = {
    "systemId": SYSTEM_ID,
    "org:us:ein": EIN,
    "org:us:uei": {"registry": {"code": "org:us:uei"}, "id": "ABCDEFGH1234"},
    "org:xi:duns": {"registry": {"code": "org:xi:duns"}, "id": "123456789"},
    "otherIds": {
        "org:candid:bridge": {
            "registry": {"code": "org:candid:bridge"},
            "id": "1234567",
        },
    },
}
OPP_IDS = {
    "opp:us:fon": {
        "registry": {
            "code": "opp:us:fon",
            "url": "https://commongrants.org/registries/opp-us-fon",
        },
        "id": "HHS-2026-ACF-OCC-YD-0001",
    },
    "opp:us:aln": {"registry": {"code": "opp:us:aln"}, "id": "93.600"},
}


# ############################################################
# Registry-keyed collections keep their exact wire keys
# ############################################################


@pytest.mark.parametrize(("model", "payload"), [(OrgIds, ORG_IDS), (OppIds, OPP_IDS)])
def test_registry_keys_round_trip_exactly(model, payload):
    ids = model.model_validate(payload)

    assert wire(ids) == payload
    assert (
        model.model_validate_json(
            ids.model_dump_json(by_alias=True, exclude_unset=True)
        )
        == ids
    )


def test_registry_keys_are_snake_case_attributes():
    org = OrgIds.model_validate(ORG_IDS)
    opp = OppIds.model_validate(OPP_IDS)

    assert isinstance(org.org_us_ein, OrgIdEin) and org.org_us_ein.id == "123456789"
    assert isinstance(org.org_us_uei, OrgIdUei)
    assert isinstance(org.org_xi_duns, OrgIdDuns)
    assert isinstance(opp.opp_us_fon, OppIdFon) and isinstance(opp.opp_us_aln, OppIdAln)
    assert isinstance(org.system_id, SystemId)
    assert org.system_id.id == UUID(SYSTEM_ID["id"])
    assert org.other_ids is not None
    assert org.other_ids["org:candid:bridge"].id == "1234567"

    built = OrgIds(org_us_ein=OrgIdEin(id="123456789"))
    assert wire(built) == {"org:us:ein": {"id": "123456789"}}


@pytest.mark.parametrize("key", ["orgUsEin", "org_us_ein_", "org:us:EIN"])
def test_specialized_collections_reject_other_spellings(key):
    with pytest.raises(ValidationError):
        OrgIds.model_validate({key: EIN})


def test_generic_collection_is_open_and_keeps_unknown_entries():
    """Core ``IdentifierCollection`` is unsealed (specializations extend it)."""
    payload = {"systemId": SYSTEM_ID, "vendorField": {"anything": [1, None]}}

    assert wire(IdentifierCollection.model_validate(payload)) == payload


# ############################################################
# Registry codes and identifier values
# ############################################################


@pytest.mark.parametrize(
    ("model", "code"),
    [
        (OrgIdEin, "org:us:uei"),
        (OrgIdUei, "org:us:ein"),
        (OrgIdDuns, "org:us:duns"),
        (OppIdFon, "opp:us:aln"),
        (OppIdAln, "opp:us:fon"),
    ],
)
def test_specialized_identifier_rejects_another_registry_code(model, code):
    with pytest.raises(ValidationError):
        model.model_validate({"registry": {"code": code}})


@pytest.mark.parametrize(
    ("model", "valid", "invalid"),
    [
        (OrgIdEin, "123456789", ["12345678", "1234567890", "12-3456789", "١٢٣٤٥٦٧٨٩"]),
        (OrgIdDuns, "123456789", ["12345678", "abcdefghi"]),
        (
            OrgIdUei,
            "ABCDEFGH1234",
            ["ABCDEFGHI234", "ABCDEFGO1234", "abcdefgh1234", "ABC"],
        ),
        (SystemId, "01912a8b-7c3d-7890-abcd-ef1234567890", ["not-a-uuid"]),
    ],
)
def test_identifier_values_follow_registry_patterns(model, valid, invalid):
    """The value pattern applies to the primary id and every ``allIds`` entry."""
    ok = model.model_validate(
        {"id": valid, "allIds": [{"id": valid, "status": "active"}]}
    )
    assert wire(ok)["id"] == valid

    for bad in invalid:
        with pytest.raises(ValidationError):
            model.model_validate({"id": bad})
        with pytest.raises(ValidationError):
            model.model_validate({"allIds": [{"id": bad, "status": "active"}]})


def test_generic_identifier_accepts_any_code_and_value():
    ident = Identifier.model_validate(
        {"registry": {"code": "org:candid:bridge"}, "id": "any value"}
    )

    assert ident.registry is not None and ident.registry.code == "org:candid:bridge"
    assert ident.all_ids is None


@pytest.mark.parametrize("payload", [{}, {"registry": {}}, {"allIds": []}])
def test_registry_code_and_primary_id_are_optional(payload):
    assert wire(OrgIdEin.model_validate(payload)) == payload


@pytest.mark.parametrize(
    "entry",
    [
        {"id": "123456789"},
        {"status": "active"},
        {"id": "123456789", "status": "retired"},
    ],
)
def test_history_entries_need_an_id_and_a_known_status(entry):
    with pytest.raises(ValidationError):
        OrgIdEin.model_validate({"allIds": [entry]})


def test_identifier_status_values():
    assert [s.value for s in IdentifierStatus] == ["active", "archived"]


@pytest.mark.parametrize(
    ("payload", "expected"),
    [
        ({"id": None}, {}),
        ({"registry": None}, {}),
        ({"allIds": None}, {}),
        ({"registry": {"code": None}}, {"registry": {}}),
        ({"registry": {"url": None}}, {"registry": {}}),
    ],
)
def test_explicit_null_identifier_properties_read_as_omitted(payload, expected):
    assert wire(Identifier.model_validate(payload)) == expected


@pytest.mark.parametrize(
    "payload",
    [
        {"unknown": 1},
        {"registry": {"code": "x", "unknown": 1}},
        {"allIds": [{"id": "x", "status": "active", "unknown": 1}]},
    ],
)
def test_identifier_objects_are_closed(payload):
    with pytest.raises(ValidationError):
        Identifier.model_validate(payload)


@pytest.mark.parametrize("url", ["not a url", "/registries/org-us-ein"])
def test_registry_url_must_be_absolute(url):
    with pytest.raises(ValidationError):
        Identifier.model_validate({"registry": {"url": url}})
