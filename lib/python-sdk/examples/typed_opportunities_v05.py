"""Opportunity identifiers and funders (Core v0.5) on a typed opportunity.

``OpportunityBase.identifiers`` is the shared ``OppIds`` collection and
``OpportunityBase.funders`` is the shared ``OrgRefCollection``: one primary funder
plus others keyed by an implementation-defined role. Both may be omitted but not
``null``. Plugin authors keep declaring custom fields the usual way::

    TypedOpportunity = OpportunityBase[OpportunityFields]

Runs as a self-check without an API::

    poetry run python -m examples.typed_opportunities_v05

and pyright checks the ``assert_type`` calls with the rest of ``examples/``.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import ValidationError
from typing_extensions import assert_type

from common_grants_sdk.extensions import (
    CustomField,
    CustomFieldSet,
    PluginMeta,
    PluginSchemas,
    define_plugin,
    schema,
)
from common_grants_sdk.schemas import (
    OppIdAln,
    OppIdFon,
    OppIds,
    OppStatus,
    OppStatusOptions,
    OpportunitiesListResponse,
    OpportunityBase,
    OpportunityDetails,
    OpportunityResponse,
    OrgRef,
    OrgRefCollection,
)


class OpportunityFields(CustomFieldSet):
    """Custom fields this implementation publishes about an opportunity."""

    priority_score: Optional[CustomField[int]] = None


TypedOpportunity = OpportunityBase[OpportunityFields]

plugin = define_plugin(
    PluginSchemas(Opportunity=schema(common_schema=TypedOpportunity)),
    meta=PluginMeta(name="research", source_system="example"),
)


def wire(model: Any) -> dict[str, Any]:
    """The wire recipe: camelCase keys, unset properties omitted, explicit nulls kept."""
    return model.model_dump(mode="json", by_alias=True, exclude_unset=True)


def build() -> TypedOpportunity:
    return TypedOpportunity(
        id=UUID("01912a8b-7c3d-7894-abcd-ef1234567890"),
        title="Research grants",
        description="Support research.",
        status=OppStatus(value=OppStatusOptions.OPEN),
        created_at=datetime(2026, 3, 1, tzinfo=UTC),
        last_modified_at=datetime(2026, 3, 1, tzinfo=UTC),
        identifiers=OppIds(
            opp_us_fon=OppIdFon(id="HHS-2026-001"),
            opp_us_aln=OppIdAln(id="93.575"),
        ),
        funders=OrgRefCollection(
            primary=OrgRef(
                id=UUID("01912a8b-7c3d-7894-abcd-ef1234567891"),
                name="Primary agency",
            ),
            other_orgs={
                "coFunder": OrgRef(
                    id=UUID("01912a8b-7c3d-7894-abcd-ef1234567892"),
                    name="Partner agency",
                ),
            },
        ),
        custom_fields=OpportunityFields.model_validate(
            {
                "priorityScore": {
                    "name": "priorityScore",
                    "fieldType": "integer",
                    "value": 7,
                }
            }
        ),
    )


def funder_names(opp: OpportunityBase[Any]) -> list[str]:
    """The primary funder first, then the others in role order."""
    funders = opp.funders
    assert_type(funders, Optional[OrgRefCollection])
    if funders is None:
        return []
    others = funders.other_orgs or {}
    return [funders.primary.name, *(org.name for org in others.values())]


def construct_and_serialize() -> dict[str, Any]:
    data = wire(build())
    assert data["identifiers"] == {
        "opp:us:fon": {"id": "HHS-2026-001"},
        "opp:us:aln": {"id": "93.575"},
    }
    assert data["funders"] == {
        "primary": {
            "id": "01912a8b-7c3d-7894-abcd-ef1234567891",
            "name": "Primary agency",
        },
        "otherOrgs": {
            "coFunder": {
                "id": "01912a8b-7c3d-7894-abcd-ef1234567892",
                "name": "Partner agency",
            }
        },
    }
    return data


def plugin_parse(data: dict[str, Any]) -> None:
    parsed = plugin.schemas.Opportunity.parse(data)
    assert_type(parsed, OpportunityBase[OpportunityFields])
    assert_type(parsed.identifiers, Optional[OppIds])
    assert parsed.identifiers is not None and parsed.identifiers.opp_us_aln is not None
    assert parsed.identifiers.opp_us_aln.id == "93.575"
    assert funder_names(parsed) == ["Primary agency", "Partner agency"]
    assert parsed.custom_fields is not None
    assert parsed.custom_fields.priority_score is not None
    assert_type(parsed.custom_fields.priority_score.value, int)
    assert parsed.custom_fields.priority_score.value == 7
    assert wire(parsed) == data


def bare_responses(data: dict[str, Any]) -> None:
    """Bare responses carry both fields with the untyped custom-field map.

    The single-opportunity envelope parses the detail form (``awards`` added).
    """
    got = OpportunityResponse.model_validate(
        {"status": 200, "message": "Success", "data": data}
    )
    assert_type(got.data, OpportunityDetails)
    assert funder_names(got.data) == ["Primary agency", "Partner agency"]
    listed = OpportunitiesListResponse.model_validate(
        {
            "status": 200,
            "message": "Success",
            "items": [data],
            "paginationInfo": {
                "page": 1,
                "pageSize": 100,
                "totalItems": 1,
                "totalPages": 1,
            },
        }
    )
    assert wire(listed)["items"] == [data]


def omitted_not_null(data: dict[str, Any]) -> None:
    minimal = {k: v for k, v in data.items() if k not in ("identifiers", "funders")}
    parsed = plugin.schemas.Opportunity.parse(minimal)
    assert parsed.identifiers is None and parsed.funders is None
    assert "identifiers" not in wire(parsed) and "funders" not in wire(parsed)
    for field in ("identifiers", "funders"):
        try:
            plugin.schemas.Opportunity.parse({**data, field: None})
        except ValidationError as exc:
            assert "optional property must be omitted, not null" in str(exc)
            continue
        raise AssertionError(f"expected a ValidationError for null {field}")


def main() -> None:
    data = construct_and_serialize()
    plugin_parse(data)
    bare_responses(data)
    omitted_not_null(data)
    print("typed opportunities v0.5: OK")


if __name__ == "__main__":
    main()
