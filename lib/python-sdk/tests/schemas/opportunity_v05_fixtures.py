"""Opportunity v0.5 wire fixtures, shared by the opportunity tests and the schema check.

``cases()`` turns them into cases for ``scripts/check-award-fixtures.mjs`` (it
dispatches by schema ``$id``, so it checks ``OpportunityBase.yaml`` as well): every
valid case is the JSON a Python model actually serialized with the wire recipe,
never the input payload, and the invalid controls are hand-written JSON the oracle
must reject.

Uses only the public SDK surface, so it also runs against an installed wheel::

    python -m tests.schemas.opportunity_v05_fixtures <out.json>
"""

from __future__ import annotations

import copy
import json
import sys
from typing import Any, Optional

from pydantic import BaseModel

from common_grants_sdk.extensions import CustomField, CustomFieldSet
from common_grants_sdk.schemas import OppIds, OpportunityBase, OrgRefCollection


class OpportunityFields(CustomFieldSet):
    """The consumer-declared opportunity custom fields used by the typed fixtures."""

    priority_score: Optional[CustomField[int]] = None


TypedOpportunity = OpportunityBase[OpportunityFields]


def wire(model: BaseModel) -> Any:
    """The documented wire recipe."""
    return model.model_dump(mode="json", by_alias=True, exclude_unset=True)


OPPORTUNITY_ID = "01912a8b-7c3d-7894-abcd-ef1234567890"

MINIMAL_OPPORTUNITY: dict[str, Any] = {
    "id": OPPORTUNITY_ID,
    "title": "Health Center Capital Improvement Program",
    "description": "Supports facility upgrades at federally qualified health centers.",
    "status": {"value": "open"},
    "createdAt": "2026-03-01T00:00:00Z",
    "lastModifiedAt": "2026-06-01T00:00:00Z",
}

IDENTIFIERS: dict[str, Any] = {
    "systemId": {
        "registry": {"code": "opp:grants.gov:system"},
        "id": OPPORTUNITY_ID,
    },
    "opp:us:fon": {
        "registry": {
            "code": "opp:us:fon",
            "url": "https://commongrants.org/registries/opp-us-fon",
        },
        "id": "HHS-2026-ACF-OCC-YD-0001",
        "allIds": [
            {"id": "HHS-2026-ACF-OCC-YD-0001", "status": "active"},
            {"id": "HHS-2025-ACF-OCC-YD-0001", "status": "archived"},
        ],
    },
    "opp:us:aln": {"registry": {"code": "opp:us:aln"}, "id": "93.224"},
    "otherIds": {"opp:grants.gov:number": {"id": "359123"}},
}

FUNDERS: dict[str, Any] = {
    "primary": {
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
    },
    "otherOrgs": {
        "coFunder": {
            "id": "018f2e77-6d7e-7f4a-9b5c-def123456789",
            "name": "Administration for Children and Families",
        },
        "pass_through": {
            "id": "018f2e77-7e8f-7a5b-8c6d-ef1234567890",
            "name": "State Department of Health",
            "identifiers": {"org:us:uei": {"id": "ABCDEFGH1234"}},
        },
    },
}

CUSTOM_FIELDS: dict[str, Any] = {
    "priorityScore": {
        "name": "priorityScore",
        "fieldType": "integer",
        "value": 7,
    },
    "reviewNote": {
        "name": "reviewNote",
        "fieldType": "string",
        "value": None,
        "description": "Required value, explicitly null",
    },
}

# Opportunity payloads keyed by fixture name; each must parse and round-trip unchanged.
OPPORTUNITIES: dict[str, dict[str, Any]] = {
    "minimal opportunity": MINIMAL_OPPORTUNITY,
    "identifiers only": {**MINIMAL_OPPORTUNITY, "identifiers": IDENTIFIERS},
    "funders only": {**MINIMAL_OPPORTUNITY, "funders": FUNDERS},
    "identifiers and funders": {
        **MINIMAL_OPPORTUNITY,
        "identifiers": IDENTIFIERS,
        "funders": FUNDERS,
    },
    "empty identifiers": {**MINIMAL_OPPORTUNITY, "identifiers": {}},
    "primary funder only": {
        **MINIMAL_OPPORTUNITY,
        "funders": {"primary": FUNDERS["primary"]},
    },
    "custom fields with both additions": {
        **MINIMAL_OPPORTUNITY,
        "identifiers": IDENTIFIERS,
        "funders": FUNDERS,
        "customFields": CUSTOM_FIELDS,
    },
}


def with_value(
    payload: dict[str, Any], path: tuple[str | int, ...], value: Any
) -> dict[str, Any]:
    """A deep copy of ``payload`` with ``value`` set at ``path``."""
    out = copy.deepcopy(payload)
    target = out
    for key in path[:-1]:
        target = target[key]
    target[path[-1]] = value
    return out


def without(payload: dict[str, Any], path: tuple[str | int, ...]) -> dict[str, Any]:
    """A deep copy of ``payload`` with the key at ``path`` removed."""
    out = copy.deepcopy(payload)
    target = out
    for key in path[:-1]:
        target = target[key]
    del target[path[-1]]
    return out


FULL_OPPORTUNITY = OPPORTUNITIES["identifiers and funders"]

# Wire JSON that violates the emitted contract for the two additions. The Python
# models and the emitted schemas must each reject every one independently.
INVALID_ADDITIONS: dict[str, dict[str, Any]] = {
    "null identifiers": {**MINIMAL_OPPORTUNITY, "identifiers": None},
    "null funders": {**MINIMAL_OPPORTUNITY, "funders": None},
    "identifiers as a list": {**MINIMAL_OPPORTUNITY, "identifiers": []},
    "funders as a list": {**MINIMAL_OPPORTUNITY, "funders": [FUNDERS["primary"]]},
    "funders missing primary": {
        **MINIMAL_OPPORTUNITY,
        "funders": {"otherOrgs": FUNDERS["otherOrgs"]},
    },
    "null funders primary": with_value(FULL_OPPORTUNITY, ("funders", "primary"), None),
    "funder missing name": without(FULL_OPPORTUNITY, ("funders", "primary", "name")),
    "funder missing id": without(FULL_OPPORTUNITY, ("funders", "primary", "id")),
    "malformed funder UUID": with_value(
        FULL_OPPORTUNITY, ("funders", "primary", "id"), "not-a-uuid"
    ),
    "null other organization": with_value(
        FULL_OPPORTUNITY, ("funders", "otherOrgs", "coFunder"), None
    ),
    "other organization missing name": without(
        FULL_OPPORTUNITY, ("funders", "otherOrgs", "coFunder", "name")
    ),
    "null otherOrgs": with_value(FULL_OPPORTUNITY, ("funders", "otherOrgs"), None),
    "extra funder property": with_value(
        FULL_OPPORTUNITY, ("funders", "primary", "legacyName"), "HRSA"
    ),
    "extra funders property": with_value(
        FULL_OPPORTUNITY, ("funders", "secondary"), FUNDERS["primary"]
    ),
    "wrong FON registry code": with_value(
        FULL_OPPORTUNITY,
        ("identifiers", "opp:us:fon", "registry", "code"),
        "opp:us:aln",
    ),
    "wrong ALN registry code": with_value(
        FULL_OPPORTUNITY,
        ("identifiers", "opp:us:aln", "registry", "code"),
        "opp:us:fon",
    ),
    "null FON": with_value(FULL_OPPORTUNITY, ("identifiers", "opp:us:fon"), None),
    "non-string FON value": with_value(
        FULL_OPPORTUNITY, ("identifiers", "opp:us:fon", "id"), 12345
    ),
    "invalid identifier status": with_value(
        FULL_OPPORTUNITY,
        ("identifiers", "opp:us:fon", "allIds", 0, "status"),
        "retired",
    ),
    "malformed systemId UUID": with_value(
        FULL_OPPORTUNITY, ("identifiers", "systemId", "id"), "not-a-uuid"
    ),
    "null other identifier": with_value(
        FULL_OPPORTUNITY,
        ("identifiers", "otherIds", "opp:grants.gov:number"),
        None,
    ),
    "extra registry-specific identifier property": with_value(
        FULL_OPPORTUNITY, ("identifiers", "opp:us:aln", "label"), "CFDA"
    ),
    "malformed registry URL": with_value(
        FULL_OPPORTUNITY,
        ("identifiers", "opp:us:fon", "registry", "url"),
        "not a url",
    ),
}


def cases() -> list[dict[str, Any]]:
    """Oracle cases built from what the Python models serialize."""
    out: list[dict[str, Any]] = []

    def case(name: str, schema_id: str, data: Any, expect: str) -> None:
        out.append(
            {"name": name, "schemaId": schema_id, "data": data, "expect": expect}
        )

    for name, payload in OPPORTUNITIES.items():
        case(
            name,
            "OpportunityBase.yaml",
            wire(OpportunityBase.model_validate(payload)),
            "valid",
        )
        case(
            f"typed: {name}",
            "OpportunityBase.yaml",
            wire(TypedOpportunity.model_validate(payload)),
            "valid",
        )
    case(
        "identifiers alone",
        "OppIds.yaml",
        wire(OppIds.model_validate(IDENTIFIERS)),
        "valid",
    )
    case(
        "funders alone",
        "OrgRefCollection.yaml",
        wire(OrgRefCollection.model_validate(FUNDERS)),
        "valid",
    )
    for name, payload in INVALID_ADDITIONS.items():
        case(f"control: {name}", "OpportunityBase.yaml", payload, "invalid")
    return out


if __name__ == "__main__":
    with open(sys.argv[1], "w") as fh:
        json.dump(cases(), fh, indent=1)
