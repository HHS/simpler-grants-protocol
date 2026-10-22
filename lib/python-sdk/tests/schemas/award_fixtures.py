"""Award wire fixtures, shared by the award tests and the independent schema check.

Payloads start from the emitted Core v0.5 examples. ``cases()`` turns them into
cases for ``scripts/check-award-fixtures.mjs``: every valid case is the JSON a
Python model actually serialized with the wire recipe, never the input payload,
and the invalid controls are hand-written JSON the oracle must reject.

Uses only the public SDK surface, so it also runs against an installed wheel::

    python -m tests.schemas.award_fixtures <out.json>
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
    AwdRecipientIndividual,
    AwdRef,
    OrgRefCollection,
)


class RecipientFields(CustomFieldSet):
    """The consumer-declared recipient custom fields used by the typed fixtures."""

    scholarship_year: Optional[CustomField[int]] = None


TypedAward = AwardBase[AwdRecipientIndividual[RecipientFields]]


def wire(model: BaseModel) -> Any:
    """The documented wire recipe."""
    return model.model_dump(mode="json", by_alias=True, exclude_unset=True)


AWARD_ID = "01912a8b-7c3d-7894-abcd-ef1234567890"
TIMESTAMP = "2026-03-01T00:00:00Z"

MINIMAL_AWARD: dict[str, Any] = {
    "id": AWARD_ID,
    "title": "Community Health Center Capital Improvement Grant",
    "description": "Supports facility upgrades at federally qualified health centers.",
    "status": {"value": "awarded"},
    "createdAt": TIMESTAMP,
    "lastModifiedAt": "2026-06-01T00:00:00Z",
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
    }
}
RECIPIENT_ORGANIZATIONS: dict[str, Any] = {
    "primary": {
        "id": "018f2e77-6d7e-7f4a-9b5c-def123456789",
        "name": "Riverside Community Health Center",
        "identifiers": {
            "org:us:ein": {"registry": {"code": "org:us:ein"}, "id": "582345679"},
            "org:us:uei": {"registry": {"code": "org:us:uei"}, "id": "ABCDEFGH1234"},
            "org:xi:duns": {"registry": {"code": "org:xi:duns"}, "id": "123456789"},
        },
    },
    "otherOrgs": {
        "fiscalAgent": {
            "id": "018f2e77-7e8f-7a5b-8c6d-ef1234567890",
            "name": "Riverside Health Foundation",
        }
    },
}
RECIPIENT_INDIVIDUAL: dict[str, Any] = {
    "name": {"prefix": "Dr.", "firstName": "Ada", "lastName": "Lovelace"},
    "identifiers": {
        "systemId": {
            "registry": {"code": "person:grants.gov:system"},
            "id": "018f2e77-8f90-7b6c-9d7e-f12345678901",
        },
        "otherIds": {
            "person:orcid": {
                "registry": {"code": "person:orcid"},
                "id": "0000-0002-1825-0097",
            }
        },
    },
    "customFields": {
        "scholarshipYear": {
            "name": "scholarshipYear",
            "fieldType": "integer",
            "value": 2026,
            "schema": "urn:example:schemas:scholarship-year",
        },
        "mentorNote": {
            "name": "mentorNote",
            "fieldType": "string",
            "value": None,
            "description": "Required value, explicitly null",
        },
        "vendor_payload": {
            "name": "vendor_payload",
            "fieldType": "object",
            "value": {"camelKey": [1, {"snake_key": None}]},
            "schema": "ftp://example.com/schemas/vendor.json",
        },
    },
}

FULL_AWARD: dict[str, Any] = {
    **MINIMAL_AWARD,
    "identifiers": {
        "systemId": {"registry": {"code": "awd:grants.gov:system"}, "id": AWARD_ID},
        "awd:us:fain": {
            "registry": {
                "code": "awd:us:fain",
                "url": "https://commongrants.org/registries/awd-us-fain",
            },
            "id": "H80CS00001",
            "allIds": [
                {"id": "H80CS00001", "status": "active"},
                {"id": "H80CS00000", "status": "archived"},
            ],
        },
        "otherIds": {"awd:usaspending:id": {"id": "ASST_NON_H80CS00001"}},
    },
    "status": {
        "value": "custom",
        "customValue": "suspended",
        "description": "Disbursements are paused pending a compliance review.",
    },
    "funding": {
        "details": "Disbursed quarterly",
        "requestedAmount": {"amount": "500000.00", "currency": "USD"},
        "awardedAmount": {"amount": "450000.00", "currency": "USD"},
        "disbursedAmount": {"amount": "150000.", "currency": "USD"},
    },
    "keyDates": {
        "awardDate": {
            "name": "Award date",
            "eventType": "singleDate",
            "date": "2026-03-01",
            "description": "The date the award was issued.",
        },
        "periodOfPerformance": {
            "name": "Period of performance",
            "eventType": "dateRange",
            "startDate": "2026-04-01",
            "endDate": "2027-03-31",
        },
        "otherDates": {
            "reportingCadence": {
                "name": "Reporting",
                "eventType": "other",
                "details": "Quarterly",
            }
        },
    },
    "opportunity": {
        "id": "018f2e77-3a4b-7c1d-9e2f-abcdef123456",
        "title": "Health Center Capital Improvement Program",
        "identifiers": {
            "opp:us:fon": {
                "registry": {
                    "code": "opp:us:fon",
                    "url": "https://commongrants.org/registries/opp-us-fon",
                },
                "id": "HHS-2026-ACF-OCC-YD-0001",
            },
            "opp:us:aln": {"registry": {"code": "opp:us:aln"}, "id": "93.224"},
        },
    },
    "application": {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "title": "My Application",
    },
    "funders": FUNDERS,
    "recipientOrganizations": RECIPIENT_ORGANIZATIONS,
    "recipientIndividual": RECIPIENT_INDIVIDUAL,
    "parent": {
        "id": "01912a8b-7c3d-7894-abcd-ef1234567891",
        "title": "Original award",
        "identifiers": {"awd:us:fain": {"id": "H80CS00000"}},
    },
    "source": "https://www.usaspending.gov/award/ASST_NON_H80CS00001",
}

ORGANIZATION_ONLY_AWARD = {
    **MINIMAL_AWARD,
    "funders": FUNDERS,
    "recipientOrganizations": RECIPIENT_ORGANIZATIONS,
}
INDIVIDUAL_ONLY_AWARD = {**MINIMAL_AWARD, "recipientIndividual": RECIPIENT_INDIVIDUAL}
BOTH_RECIPIENTS_AWARD = {
    **MINIMAL_AWARD,
    "recipientOrganizations": RECIPIENT_ORGANIZATIONS,
    "recipientIndividual": RECIPIENT_INDIVIDUAL,
}
APPLICATION_AND_PARENT_AWARD = {
    **MINIMAL_AWARD,
    "application": FULL_AWARD["application"],
    "parent": {"id": FULL_AWARD["parent"]["id"], "title": "Original award"},
}

# Award payloads keyed by fixture name; each must parse and round-trip unchanged.
AWARDS: dict[str, dict[str, Any]] = {
    "minimal award": MINIMAL_AWARD,
    "full award": FULL_AWARD,
    "organization-only recipient": ORGANIZATION_ONLY_AWARD,
    "individual-only recipient": INDIVIDUAL_ONLY_AWARD,
    "both recipient forms": BOTH_RECIPIENTS_AWARD,
    "application and parent references": APPLICATION_AND_PARENT_AWARD,
    "recipient with empty customFields": {
        **MINIMAL_AWARD,
        "recipientIndividual": {"customFields": {}},
    },
}

FILTERS: dict[str, Any] = {
    "status": {"operator": "in", "value": ["awarded", "completed"]},
    "opportunityId": {
        "operator": "in",
        "value": ["018f2e77-3a4b-7c1d-9e2f-abcdef123456"],
    },
    "awardDateRange": {
        "operator": "between",
        "value": {"min": "2026-01-01", "max": "2026-12-31T23:59:59-05:00"},
    },
    "awardedAmountRange": {
        "operator": "outside",
        "value": {
            "min": {"amount": "100000", "currency": "USD"},
            "max": {"amount": "500000", "currency": "USD"},
        },
    },
    "customFilters": {
        "fiscalYear": {"operator": "eq", "value": 2026},
        "clearedFlag": {"operator": "eq", "value": None},
    },
}
DEFAULT_FILTERS: dict[str, Any] = {
    "status": FILTERS["status"],
    "region": {"operator": "in", "value": ["US-CA"]},
}
SORTING: dict[str, Any] = {
    "sortBy": "custom",
    "customSortBy": "fiscalYear",
    "sortOrder": "asc",
}
PAGINATION_INFO: dict[str, Any] = {
    "page": 2,
    "pageSize": 25,
    "totalItems": 60,
    "totalPages": 3,
}
SORT_INFO: dict[str, Any] = {"sortBy": "lastModifiedAt", "sortOrder": "desc"}

LIST_RESPONSE: dict[str, Any] = {
    "status": 200,
    "message": "Awards retrieved successfully",
    "items": [MINIMAL_AWARD, FULL_AWARD],
    "paginationInfo": PAGINATION_INFO,
}
SORTED_RESPONSE: dict[str, Any] = {**LIST_RESPONSE, "sortInfo": SORT_INFO}
FILTERED_RESPONSE: dict[str, Any] = {
    **SORTED_RESPONSE,
    "sortInfo": {**SORT_INFO, "customSortBy": "fiscalYear", "errors": ["ignored sort"]},
    "filterInfo": {"filters": FILTERS, "errors": ["unsupported filter: region"]},
}


def routes() -> dict[str, tuple[type[BaseModel], str, dict[str, Any]]]:
    """Route payloads: ``name -> (model, emitted schema id, payload)``."""
    from common_grants_sdk.schemas import (
        AwardGetRequest,
        AwardResponse,
        AwardsFilteredResponse,
        AwardsListRequest,
        AwardsListResponse,
        AwardsSortedResponse,
        AwdDefaultFilters,
        AwdFilters,
        AwdSearchRequest,
        AwdSorting,
    )

    return {
        "list request, defaults": (AwardsListRequest, "AwardsListRequest.yaml", {}),
        "list request, page": (
            AwardsListRequest,
            "AwardsListRequest.yaml",
            {"page": 3, "pageSize": 2147483647},
        ),
        "get request": (AwardGetRequest, "AwardGetRequest.yaml", {"awdId": AWARD_ID}),
        "search request, empty": (AwdSearchRequest, "AwdSearchRequest.yaml", {}),
        "search request, full": (
            AwdSearchRequest,
            "AwdSearchRequest.yaml",
            {
                "search": "community health",
                "filters": FILTERS,
                "sorting": SORTING,
                "pagination": {"page": 1, "pageSize": 50},
            },
        ),
        "default filters with root custom filter": (
            AwdDefaultFilters,
            "AwdDefaultFilters.yaml",
            DEFAULT_FILTERS,
        ),
        "filters": (AwdFilters, "AwdFilters.yaml", FILTERS),
        "sorting, required only": (AwdSorting, "AwdSorting.yaml", {"sortBy": "title"}),
        "award response": (
            AwardResponse,
            "AwardResponse.yaml",
            {"status": 200, "message": "Success", "data": FULL_AWARD},
        ),
        "list response": (AwardsListResponse, "AwardsListResponse.yaml", LIST_RESPONSE),
        "list response, required pagination only": (
            AwardsListResponse,
            "AwardsListResponse.yaml",
            {
                **LIST_RESPONSE,
                "items": [],
                "paginationInfo": {"page": 1, "pageSize": 1},
            },
        ),
        "sorted response": (
            AwardsSortedResponse,
            "AwardsSortedResponse.yaml",
            SORTED_RESPONSE,
        ),
        "filtered response": (
            AwardsFilteredResponse,
            "AwardsFilteredResponse.yaml",
            FILTERED_RESPONSE,
        ),
    }


def _control(
    name: str, schema_id: str, data: Any, expect: str = "invalid"
) -> dict[str, Any]:
    return {"name": name, "schemaId": schema_id, "data": data, "expect": expect}


def _with(payload: dict[str, Any], path: tuple[str, ...], value: Any) -> dict[str, Any]:
    """A deep copy of ``payload`` with ``value`` set at ``path``."""
    out = copy.deepcopy(payload)
    target = out
    for key in path[:-1]:
        target = target[key]
    target[path[-1]] = value
    return out


# Hand-written JSON with a known verdict: proves the oracle bites both ways.
CONTROLS: list[dict[str, Any]] = [
    _control(
        "control: required custom value may be null",
        "CustomField.yaml",
        {"name": "x", "fieldType": "string", "value": None},
        expect="valid",
    ),
    _control(
        "control: malformed award id", "AwardBase.yaml", {**MINIMAL_AWARD, "id": "nope"}
    ),
    _control(
        "control: malformed source URI",
        "AwardBase.yaml",
        {**MINIMAL_AWARD, "source": "not a uri"},
    ),
    _control(
        "control: naive createdAt",
        "AwardBase.yaml",
        {**MINIMAL_AWARD, "createdAt": "2026-03-01T00:00:00"},
    ),
    _control(
        "control: null recipientIndividual",
        "AwardBase.yaml",
        {**MINIMAL_AWARD, "recipientIndividual": None},
    ),
    _control(
        "control: root customFields",
        "AwardBase.yaml",
        {**MINIMAL_AWARD, "customFields": RECIPIENT_INDIVIDUAL["customFields"]},
    ),
    _control(
        "control: null custom field entry",
        "AwardBase.yaml",
        _with(
            INDIVIDUAL_ONLY_AWARD, ("recipientIndividual", "customFields", "x"), None
        ),
    ),
    _control(
        "control: null optional metadata",
        "AwardBase.yaml",
        _with(FULL_AWARD, ("keyDates", "awardDate", "description"), None),
    ),
    _control(
        "control: missing eventType",
        "AwardBase.yaml",
        _with(
            FULL_AWARD, ("keyDates", "awardDate"), {"name": "x", "date": "2026-03-01"}
        ),
    ),
    _control(
        "control: application with legacy name",
        "AwardBase.yaml",
        {**MINIMAL_AWARD, "application": {"id": AWARD_ID, "name": "x"}},
    ),
    _control(
        "control: leading-dot decimal",
        "AwardBase.yaml",
        _with(FULL_AWARD, ("funding", "awardedAmount", "amount"), ".5"),
    ),
    _control(
        "control: wrong FAIN registry code",
        "AwardBase.yaml",
        _with(
            FULL_AWARD,
            ("identifiers", "awd:us:fain", "registry", "code"),
            "awd:us:other",
        ),
    ),
    _control(
        "control: date range filter missing max",
        "AwdFilters.yaml",
        {"awardDateRange": {"operator": "between", "value": {"min": "2026-01-01"}}},
    ),
    _control("control: page zero", "AwardsListRequest.yaml", {"page": 0}),
    _control(
        "control: response status 201",
        "AwardResponse.yaml",
        {"status": 201, "message": "Created", "data": MINIMAL_AWARD},
    ),
]


def _plain_time_award() -> dict[str, Any]:
    award = _with(FULL_AWARD, ("keyDates", "awardDate", "time"), "14:30:00")
    award["keyDates"]["periodOfPerformance"]["endTime"] = "17:00:00.5"
    return award


def cases() -> list[dict[str, Any]]:
    """Oracle cases built from what the Python models serialize."""
    out: list[dict[str, Any]] = []

    def valid(name: str, schema_id: str, data: Any, expect: str = "valid") -> None:
        out.append(
            {"name": name, "schemaId": schema_id, "data": data, "expect": expect}
        )

    for name, payload in AWARDS.items():
        valid(name, "AwardBase.yaml", wire(AwardBase.model_validate(payload)))
        valid(
            f"typed recipient: {name}",
            "AwardBase.yaml",
            wire(TypedAward.model_validate(payload)),
        )
    valid(
        "constructed award, defaulted event discriminators",
        "AwardBase.yaml",
        wire(
            TypedAward.model_validate(
                _with(
                    FULL_AWARD,
                    ("keyDates", "awardDate"),
                    {"name": "x", "date": "2026-03-01"},
                )
            )
        ),
    )
    valid(
        "award reference",
        "AwdRef.yaml",
        wire(AwdRef.model_validate(FULL_AWARD["parent"])),
    )
    valid(
        "organization collection",
        "OrgRefCollection.yaml",
        wire(OrgRefCollection.model_validate(RECIPIENT_ORGANIZATIONS)),
    )
    valid(
        "typed recipient alone",
        "AwdRecipientIndividual.yaml",
        wire(
            AwdRecipientIndividual[RecipientFields].model_validate(RECIPIENT_INDIVIDUAL)
        ),
    )
    for name, (model, schema_id, payload) in routes().items():
        valid(name, schema_id, wire(model.model_validate(payload)))
    from common_grants_sdk.schemas import AwardResponse

    typed = AwardResponse[TypedAward].model_validate(
        {"status": 200, "message": "ok", "data": FULL_AWARD}
    )
    valid("typed award response", "AwardResponse.yaml", wire(typed))
    valid(
        "plain-time: award with Core isoTime values",
        "AwardBase.yaml",
        wire(AwardBase.model_validate(_plain_time_award())),
        expect="plain-time",
    )
    out.extend(CONTROLS)
    return out


if __name__ == "__main__":
    with open(sys.argv[1], "w") as fh:
        json.dump(cases(), fh, indent=1)
