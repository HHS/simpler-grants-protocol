"""Opportunity v0.5 wire fixtures, shared by the opportunity tests and the schema check.

``cases()`` turns them into cases for ``scripts/check-award-fixtures.mjs`` (it
dispatches by schema ``$id``, so it checks ``OpportunityBase.yaml``,
``OpportunityDetails.yaml`` and the related ``AwardBase.yaml`` records too): every
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
from common_grants_sdk.schemas import (
    AwardBase,
    OppIds,
    OpportunityBase,
    OpportunityDetails,
    OrgRefCollection,
)


class OpportunityFields(CustomFieldSet):
    """The consumer-declared opportunity custom fields used by the typed fixtures."""

    priority_score: Optional[CustomField[int]] = None


TypedOpportunity = OpportunityBase[OpportunityFields]
TypedDetails = OpportunityDetails[OpportunityFields]


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

# Wire JSON that violates the emitted contract for the two additions. The emitted
# schemas must reject every one; the Python models reject every one except the
# nulls on optional properties (NULL_OPTIONAL_ADDITIONS), which read as omitted.
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

# The case name and the path of its null optional property.
NULL_OPTIONAL_ADDITIONS: dict[str, tuple[str, ...]] = {
    "null identifiers": ("identifiers",),
    "null funders": ("funders",),
    "null otherOrgs": ("funders", "otherOrgs"),
    "null FON": ("identifiers", "opp:us:fon"),
}


# ############################################################
# Opportunity details: related awards
# ############################################################

# The website mock's Clean Energy Innovation opportunity (fixtures.ts) and the two
# awards it publishes, the base award and its amendment (award-refs.ts). Each kept
# field is copied exactly as the v0.5 detail route serves it. keyDates is left out
# because its plain closeDate.time is the #1319 schema discrepancy, competitions is
# out of scope, and funding and acceptedApplicantTypes are trimmed.
CLEAN_ENERGY_OPPORTUNITY_ID = "4c5d6e7f-8091-42a3-9d4e-5f6a7b8c9d0e"

AWARD_REFS: list[dict[str, Any]] = [
    {
        "id": "aa1b2c3d-4e5f-4061-8a7b-8c9d0e1f2032",
        "title": "Clean Energy Innovation Demonstration Award",
        "identifiers": {
            "systemId": {
                "registry": {"code": "awd:grants.gov:system"},
                "id": "01912a8b-7c3d-7894-abcd-ef1234567892",
            },
            "awd:us:fain": {
                "registry": {
                    "code": "awd:us:fain",
                    "url": "https://commongrants.org/registries/awd-us-fain",
                },
                "id": "DE0000101",
            },
        },
    },
    {
        "id": "dd4e5f60-7182-4394-8d0e-1f2031425365",
        "title": "Clean Energy Innovation Demonstration Award — Amendment 1",
        "identifiers": {
            "systemId": {
                "registry": {"code": "awd:grants.gov:system"},
                "id": "01912a8b-7c3d-7894-abcd-ef1234567895",
            },
            "awd:us:fain": {
                "registry": {
                    "code": "awd:us:fain",
                    "url": "https://commongrants.org/registries/awd-us-fain",
                },
                "id": "DE0000101-A1",
            },
        },
    },
]

CLEAN_ENERGY_OPPORTUNITY: dict[str, Any] = {
    "id": CLEAN_ENERGY_OPPORTUNITY_ID,
    "title": "Clean Energy Innovation",
    "funders": {
        "primary": {
            "id": "018f2e77-5c6d-7e3f-8a4b-cdef12345678",
            "name": "National Science Foundation",
            "identifiers": {
                "otherIds": {
                    "org:grants.gov:agency": {
                        "registry": {"code": "org:grants.gov:agency"},
                        "id": "NSF",
                    }
                }
            },
        }
    },
    "status": {"value": "open", "description": "Currently accepting applications"},
    "description": "Supporting research and deployment of clean energy technologies.",
    "awards": AWARD_REFS,
    "createdAt": "2025-03-01T00:00:00Z",
    "lastModifiedAt": "2025-03-12T00:00:00Z",
}

# The two award records those references point at, as the v0.5 award route serves
# them, trimmed to the preview fields, the opportunity backlink, and the
# amendment's parent. Literal copies, so a drift from the references shows up.
CLEAN_ENERGY_AWARDS: list[dict[str, Any]] = [
    {
        "id": "aa1b2c3d-4e5f-4061-8a7b-8c9d0e1f2032",
        "title": "Clean Energy Innovation Demonstration Award",
        "identifiers": {
            "systemId": {
                "registry": {"code": "awd:grants.gov:system"},
                "id": "01912a8b-7c3d-7894-abcd-ef1234567892",
            },
            "awd:us:fain": {
                "registry": {
                    "code": "awd:us:fain",
                    "url": "https://commongrants.org/registries/awd-us-fain",
                },
                "id": "DE0000101",
            },
        },
        "description": (
            "Supports a pilot-scale demonstration of a long-duration storage system."
        ),
        "status": {
            "value": "awarded",
            "description": "Award has been issued and funds are being disbursed.",
        },
        "opportunity": {
            "id": CLEAN_ENERGY_OPPORTUNITY_ID,
            "title": "Clean Energy Innovation",
        },
        "createdAt": "2026-06-10T00:00:00Z",
        "lastModifiedAt": "2026-06-25T00:00:00Z",
    },
    {
        "id": "dd4e5f60-7182-4394-8d0e-1f2031425365",
        "title": "Clean Energy Innovation Demonstration Award — Amendment 1",
        "identifiers": {
            "systemId": {
                "registry": {"code": "awd:grants.gov:system"},
                "id": "01912a8b-7c3d-7894-abcd-ef1234567895",
            },
            "awd:us:fain": {
                "registry": {
                    "code": "awd:us:fain",
                    "url": "https://commongrants.org/registries/awd-us-fain",
                },
                "id": "DE0000101-A1",
            },
        },
        "description": (
            "Adds scope for grid-interconnection studies to the base demonstration "
            "award."
        ),
        "status": {
            "value": "awarded",
            "description": "Award has been issued and funds are being disbursed.",
        },
        "opportunity": {
            "id": CLEAN_ENERGY_OPPORTUNITY_ID,
            "title": "Clean Energy Innovation",
        },
        "parent": {
            "id": "aa1b2c3d-4e5f-4061-8a7b-8c9d0e1f2032",
            "title": "Clean Energy Innovation Demonstration Award",
            "identifiers": {
                "systemId": {
                    "registry": {"code": "awd:grants.gov:system"},
                    "id": "01912a8b-7c3d-7894-abcd-ef1234567892",
                },
                "awd:us:fain": {
                    "registry": {
                        "code": "awd:us:fain",
                        "url": "https://commongrants.org/registries/awd-us-fain",
                    },
                    "id": "DE0000101",
                },
            },
        },
        "createdAt": "2026-06-20T00:00:00Z",
        "lastModifiedAt": "2026-06-21T00:00:00Z",
    },
]

# Detail payloads keyed by fixture name; each must parse and round-trip unchanged.
DETAILS: dict[str, dict[str, Any]] = {
    "omitted awards": without(CLEAN_ENERGY_OPPORTUNITY, ("awards",)),
    "empty awards": {**CLEAN_ENERGY_OPPORTUNITY, "awards": []},
    "one award": {**CLEAN_ENERGY_OPPORTUNITY, "awards": AWARD_REFS[:1]},
    "base and amended awards": CLEAN_ENERGY_OPPORTUNITY,
    "award without identifiers": {
        **CLEAN_ENERGY_OPPORTUNITY,
        "awards": [{"id": AWARD_REFS[0]["id"], "title": AWARD_REFS[0]["title"]}],
    },
    "custom fields with awards": {
        **CLEAN_ENERGY_OPPORTUNITY,
        "identifiers": IDENTIFIERS,
        "customFields": CUSTOM_FIELDS,
    },
}

# Wire JSON that violates the emitted contract for awards. The emitted schemas
# must reject every one; the Python models reject every one except the nulls on
# optional properties (NULL_OPTIONAL_AWARDS), which read as omitted.
INVALID_AWARDS: dict[str, dict[str, Any]] = {
    "null awards": {**CLEAN_ENERGY_OPPORTUNITY, "awards": None},
    "awards as an object": {**CLEAN_ENERGY_OPPORTUNITY, "awards": AWARD_REFS[0]},
    "awards as a string": {**CLEAN_ENERGY_OPPORTUNITY, "awards": "none"},
    "null award entry": with_value(CLEAN_ENERGY_OPPORTUNITY, ("awards", 1), None),
    "award missing id": without(CLEAN_ENERGY_OPPORTUNITY, ("awards", 0, "id")),
    "award missing title": without(CLEAN_ENERGY_OPPORTUNITY, ("awards", 0, "title")),
    "malformed award UUID": with_value(
        CLEAN_ENERGY_OPPORTUNITY, ("awards", 0, "id"), "not-a-uuid"
    ),
    "non-string award title": with_value(
        CLEAN_ENERGY_OPPORTUNITY, ("awards", 0, "title"), 101
    ),
    "null award identifiers": with_value(
        CLEAN_ENERGY_OPPORTUNITY, ("awards", 0, "identifiers"), None
    ),
    "wrong FAIN registry code": with_value(
        CLEAN_ENERGY_OPPORTUNITY,
        ("awards", 0, "identifiers", "awd:us:fain", "registry", "code"),
        "awd:us:other",
    ),
    "extra award property": with_value(
        CLEAN_ENERGY_OPPORTUNITY, ("awards", 0, "awardedAmount"), "480000.00"
    ),
    "extra FAIN identifier property": with_value(
        CLEAN_ENERGY_OPPORTUNITY,
        ("awards", 0, "identifiers", "awd:us:fain", "label"),
        "FAIN",
    ),
}

# The case name and the path of its null optional property.
NULL_OPTIONAL_AWARDS: dict[str, tuple[Any, ...]] = {
    "null awards": ("awards",),
    "null award identifiers": ("awards", 0, "identifiers"),
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
    for name, payload in DETAILS.items():
        case(
            f"details: {name}",
            "OpportunityDetails.yaml",
            wire(OpportunityDetails.model_validate(payload)),
            "valid",
        )
        case(
            f"typed details: {name}",
            "OpportunityDetails.yaml",
            wire(TypedDetails.model_validate(payload)),
            "valid",
        )
    for award in CLEAN_ENERGY_AWARDS:
        case(
            f"related award: {award['title']}",
            "AwardBase.yaml",
            wire(AwardBase.model_validate(award)),
            "valid",
        )
    for name, payload in INVALID_AWARDS.items():
        case(f"details control: {name}", "OpportunityDetails.yaml", payload, "invalid")
    return out


if __name__ == "__main__":
    with open(sys.argv[1], "w") as fh:
        json.dump(cases(), fh, indent=1)
