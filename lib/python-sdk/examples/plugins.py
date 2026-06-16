"""Plugin authoring examples -- every scenario in one module.

Each scenario builds a schema extension with the overloaded ``schema(...)`` factory
(mappings XOR hand-written functions XOR schema-only, enforced statically), then
assembles a ``Plugin`` with ``define_plugin``. ``CustomField[V]`` is the single
source of truth for custom fields: ``field_type`` is derived from ``V``. A plugin is
just the ``Plugin`` ``define_plugin`` returns, so each scenario is a self-contained
plugin in this one file.

Run the consumer side with ``poetry run python examples/plugins.py``.
"""

from __future__ import annotations

from typing import Any, Callable, Optional, cast

from pydantic import BaseModel, Field

from common_grants_sdk.extensions import (
    CustomField,
    CustomFieldSet,
    NoCustomFields,
    PassthroughModel,
    PluginMeta,
    PluginSchemas,
    TransformResult,
    build_transforms,
    define_plugin,
    schema,
    validate_into,
)
from common_grants_sdk.schemas.pydantic.models import Opportunity
from common_grants_sdk.utils.transformation import get_from_path

# --- Author-declared custom-field containers ----------------------------------


class AgencyFields(CustomFieldSet):
    """The single custom field shared by the mappings and functions scenarios."""

    agency_code: Optional[CustomField[str]] = Field(
        default=None, description="Agency code carried from grants.gov."
    )


class ExtensionFields(CustomFieldSet):
    """HHS- and locality-specific custom fields (schema-only scenario)."""

    program_area: Optional[CustomField[str]] = Field(
        default=None, description="HHS program area code (e.g. 'CFDA-93.243')"
    )
    legacy_grant_id: Optional[CustomField[int]] = Field(
        default=None, description="Numeric ID from the legacy grants management system"
    )
    eligibility_types: Optional[CustomField[list[str]]] = Field(
        default=None, description="Types of organizations eligible to apply"
    )
    award_ceiling: Optional[CustomField[float]] = Field(
        default=None, description="Maximum award amount in USD"
    )


class GrantsGovFields(CustomFieldSet):
    """Custom fields grants.gov carries on the Opportunity schema."""

    legacy_id: Optional[CustomField[int]] = Field(
        default=None, description="Unique identifier in legacy database"
    )
    legacy_id_str: Optional[CustomField[str]] = Field(
        default=None, description="Legacy ID coerced to a string via numberToString"
    )
    agency_name: Optional[CustomField[str]] = Field(
        default=None, description="Agency hosting the opportunity"
    )
    applicant_types: Optional[CustomField[list[str]]] = Field(
        default=None, description="Types of applicants eligible to apply"
    )
    priority_score: Optional[CustomField[float]] = Field(
        default=None, description="Numeric priority score coerced from a string"
    )
    composite_label: Optional[CustomField[str]] = Field(
        default=None,
        description="Composite '<opportunity_number> -- <opportunity_title>' label",
    )


# --- Scenario 1: custom fields + declarative mappings -------------------------

mappings_plugin = define_plugin(
    PluginSchemas(
        Opportunity=schema(
            source_schema=PassthroughModel,
            common_schema=Opportunity[AgencyFields],
            mappings={
                "to_common": {
                    "id": {"field": "opportunity_uuid"},
                    "title": {"field": "opportunity_title"},
                    "description": {"field": "opportunity_description"},
                    "createdAt": {"field": "created_at"},
                    "lastModifiedAt": {"field": "last_modified_at"},
                    "status": {
                        "value": {
                            "match": {
                                "field": "opportunity_status",
                                "case": {"posted": "open", "archived": "closed"},
                                "default": "custom",
                            }
                        }
                    },
                    "customFields": {
                        "agencyCode": {
                            "value": {"field": "agency_code"},
                            "name": {"const": "agencyCode"},
                            "fieldType": {"const": "string"},
                        }
                    },
                },
                "from_common": {
                    "opportunity_uuid": {"field": "id"},
                    "opportunity_title": {"field": "title"},
                    "opportunity_status": {"const": "posted"},
                    "agency_code": {"field": "customFields.agencyCode.value"},
                },
            },
        )
    ),
    meta=PluginMeta(name="grants.gov (mappings)", source_system="grants.gov"),
)


# --- Scenario 2: custom fields + hand-written functions -----------------------


class GrantsGovOpportunity(BaseModel):
    """The grants.gov source shape (validated on the from_common output)."""

    opportunity_uuid: str
    opportunity_title: str
    opportunity_description: str
    opportunity_status: str
    created_at: str
    last_modified_at: str
    agency_code: str


def gadget_to_common(
    source: GrantsGovOpportunity,
) -> TransformResult[Opportunity[AgencyFields]]:
    return validate_into(
        Opportunity[AgencyFields],
        {
            "id": source.opportunity_uuid,
            "title": source.opportunity_title,
            "description": source.opportunity_description,
            "status": {
                "value": "open" if source.opportunity_status == "posted" else "custom"
            },
            "createdAt": source.created_at,
            "lastModifiedAt": source.last_modified_at,
            "customFields": {
                "agencyCode": {
                    "name": "agencyCode",
                    "fieldType": "string",
                    "value": source.agency_code,
                }
            },
        },
    )


def gadget_from_common(
    common: Opportunity[AgencyFields],
) -> TransformResult[GrantsGovOpportunity]:
    # The make-or-break path: `common` is fully typed (agency_code.value -> str).
    agency = ""
    if common.custom_fields and common.custom_fields.agency_code:
        agency = common.custom_fields.agency_code.value
    return validate_into(
        GrantsGovOpportunity,
        {
            "opportunity_uuid": str(common.id),
            "opportunity_title": common.title,
            "opportunity_description": common.description,
            "opportunity_status": "posted",
            "created_at": common.created_at.isoformat(),
            "last_modified_at": common.last_modified_at.isoformat(),
            "agency_code": agency,
        },
    )


functions_plugin = define_plugin(
    PluginSchemas(
        Opportunity=schema(
            source_schema=GrantsGovOpportunity,
            common_schema=Opportunity[AgencyFields],
            to_common=gadget_to_common,
            from_common=gadget_from_common,
        )
    ),
    meta=PluginMeta(name="grants.gov (functions)", source_system="grants.gov"),
)


# --- Scenario 3: declarative mappings, no custom fields -----------------------

base_plugin = define_plugin(
    PluginSchemas(
        Opportunity=schema(
            source_schema=PassthroughModel,
            common_schema=Opportunity[NoCustomFields],
            mappings={
                "to_common": {
                    "id": {"field": "opportunity_uuid"},
                    "title": {"field": "opportunity_title"},
                    "description": {"field": "opportunity_description"},
                    "createdAt": {"field": "created_at"},
                    "lastModifiedAt": {"field": "last_modified_at"},
                    "status": {
                        "value": {
                            "match": {
                                "field": "opportunity_status",
                                "case": {"posted": "open", "archived": "closed"},
                                "default": "custom",
                            }
                        }
                    },
                },
                "from_common": {
                    "opportunity_uuid": {"field": "id"},
                    "opportunity_title": {"field": "title"},
                    "opportunity_status": {"const": "posted"},
                },
            },
        )
    ),
    meta=PluginMeta(name="grants.gov (no custom fields)", source_system="grants.gov"),
)


# --- Scenario 4: custom fields only, no transforms ----------------------------

opportunity_extensions = define_plugin(
    PluginSchemas(Opportunity=schema(common_schema=Opportunity[ExtensionFields])),
    meta=PluginMeta(name="opportunity extensions", source_system="hhs"),
)


# --- Realistic combined plugin: grants.gov ------------------------------------


def _join_fields(data: dict[str, Any], spec: dict[str, Any]) -> str | None:
    sep = spec.get("sep", " ")
    parts = [get_from_path(data, path) for path in spec.get("fields", [])]
    values = [str(p) for p in parts if p is not None]
    return sep.join(values) if values else None


# Both directions are author-provided -- build_transforms() does not invert one into
# the other because many-to-one handlers like ``match`` are not reversible.
_gg_to_common, _gg_from_common = build_transforms(
    handlers={"join": _join_fields},
    common_schema=Opportunity[GrantsGovFields],
    source_schema=PassthroughModel,
    to_common_mapping={
        "id": {"field": "data.opportunity_uuid"},
        "title": {"field": "data.opportunity_title"},
        "description": {"field": "data.opportunity_description"},
        "createdAt": {"field": "data.created_at"},
        "lastModifiedAt": {"field": "data.last_modified_at"},
        "status": {
            "value": {
                "match": {
                    "field": "data.opportunity_status",
                    "case": {
                        "forecasted": "forecasted",
                        "posted": "open",
                        "archived": "closed",
                    },
                    "default": "custom",
                }
            },
            "description": {
                "const": "The opportunity is currently accepting applications"
            },
        },
        "funding": {
            "minAwardAmount": {
                "amount": {"numberToString": "data.summary.award_floor"},
                "currency": {"const": "USD"},
            },
            "maxAwardAmount": {
                "amount": {"numberToString": "data.summary.award_ceiling"},
                "currency": {"const": "USD"},
            },
        },
        "keyDates": {
            "appOpens": {
                "name": {"const": "Open Date"},
                "date": {"field": "data.summary.forecasted_post_date"},
                "description": {"const": "Applications begin being accepted"},
            },
            "appDeadline": {
                "name": {"const": "Application Deadline"},
                "date": {"field": "data.summary.forecasted_close_date"},
                "description": {
                    "const": "Final submission deadline for all grant applications"
                },
            },
        },
        "customFields": {
            "legacyIdStr": {
                "value": {"numberToString": "data.opportunity_id"},
                "name": {"const": "legacyIdStr"},
                "fieldType": {"const": "string"},
            },
            "priorityScore": {
                "value": {"stringToNumber": "data.priority_score_str"},
                "name": {"const": "priorityScore"},
                "fieldType": {"const": "number"},
            },
            "compositeLabel": {
                "value": {
                    "join": {
                        "fields": ["data.opportunity_number", "data.opportunity_title"],
                        "sep": " -- ",
                    }
                },
                "name": {"const": "compositeLabel"},
                "fieldType": {"const": "string"},
            },
        },
    },
    from_common_mapping={
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
                "award_floor": {"stringToNumber": "funding.minAwardAmount.amount"},
                "award_ceiling": {"stringToNumber": "funding.maxAwardAmount.amount"},
                "forecasted_post_date": {"field": "keyDates.appOpens.date"},
                "forecasted_close_date": {"field": "keyDates.appDeadline.date"},
            },
            "priority_score_str": {
                "numberToString": "customFields.priorityScore.value"
            },
        }
    },
)

# build_transforms returns loosely-typed callables (its output may be a dict on a
# validation error). Restate the precise signatures for the typed consumer surface.
gg_to_common = cast(
    Callable[[PassthroughModel], TransformResult[Opportunity[GrantsGovFields]]],
    _gg_to_common,
)
gg_from_common = cast(
    Callable[[Opportunity[GrantsGovFields]], TransformResult[PassthroughModel]],
    _gg_from_common,
)

grants_gov = define_plugin(
    PluginSchemas(
        Opportunity=schema(
            source_schema=PassthroughModel,
            common_schema=Opportunity[GrantsGovFields],
            to_common=gg_to_common,
            from_common=gg_from_common,
        )
    ),
    meta=PluginMeta(
        name="grants-gov",
        version="0.1.0",
        source_system="grants.gov",
        capabilities=["customFields", "transforms"],
    ),
)


# --- Consumer side: validate each plugin in this same file --------------------
#
# Consumers use non-optional dot access on ``plugin.schemas.Opportunity``. The
# ``assert_type`` lines document the concrete static types each plugin yields.
# Run with: poetry run python examples/plugins.py

from typing import assert_type  # noqa: E402

from common_grants_sdk.extensions import SchemaOnly  # noqa: E402

_FLAT_SOURCE = {
    "opportunity_uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "opportunity_title": "Conservation research",
    "opportunity_description": "Funding for conservation.",
    "opportunity_status": "posted",
    "created_at": "2025-01-01T00:00:00Z",
    "last_modified_at": "2025-01-01T00:00:00Z",
    "agency_code": "HHS-123",
}

_GRANTS_GOV_SOURCE = {
    "data": {
        "opportunity_uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "opportunity_id": 12345,
        "opportunity_number": "ABC-123-XYZ-001",
        "opportunity_title": "Research into conservation techniques",
        "opportunity_description": "Funding to advance conservation research.",
        "opportunity_status": "posted",
        "created_at": "2025-01-15T09:00:00Z",
        "last_modified_at": "2025-04-01T12:30:00Z",
        "priority_score_str": "75",
        "summary": {
            "award_floor": 10000,
            "award_ceiling": 100000,
            "forecasted_post_date": "2025-05-01",
            "forecasted_close_date": "2025-07-15",
        },
    }
}

_SCHEMA_ONLY_RECORD = {
    "id": "573525f2-8e15-4405-83fb-e6523511d893",
    "title": "Community Health Innovation Grant",
    "status": {"value": "open"},
    "description": "Funding for community-led health initiatives",
    "createdAt": "2025-03-01T00:00:00Z",
    "lastModifiedAt": "2025-03-15T00:00:00Z",
    "customFields": {
        "legacyGrantId": {
            "name": "legacyGrantId",
            "fieldType": "integer",
            "value": 98765,
        }
    },
}


def _check(label: str, ok: bool) -> None:
    print(f"  [{'PASS' if ok else 'FAIL'}] {label}")


def main() -> None:
    # Scenario 1 -- custom fields + declarative mappings
    print("Scenario 1 -- custom fields + mappings")
    res1 = mappings_plugin.schemas.Opportunity.to_common(
        PassthroughModel.model_validate(_FLAT_SOURCE)
    )
    assert_type(res1, TransformResult[Opportunity[AgencyFields]])
    opp1 = res1.result
    _check("no transform errors", res1.errors == [])
    _check("title mapped", opp1.title == "Conservation research")
    cf1 = opp1.custom_fields
    if cf1 and cf1.agency_code:
        assert_type(cf1.agency_code.value, str)
        _check(
            "agency_code.value typed str == 'HHS-123'",
            cf1.agency_code.value == "HHS-123",
        )
    specs = mappings_plugin.schemas.Opportunity.custom_fields
    _check(
        "inspect: agency_code field_type derived STRING",
        specs["agency_code"].field_type is not None
        and specs["agency_code"].field_type.value == "string",
    )
    back1 = mappings_plugin.schemas.Opportunity.from_common(opp1)
    _check("round-trips (validated source instance)", not back1.errors)

    # Scenario 2 -- custom fields + hand-written functions
    print("Scenario 2 -- custom fields + hand-written functions")
    res2 = functions_plugin.schemas.Opportunity.to_common(
        GrantsGovOpportunity(**_FLAT_SOURCE)
    )
    g = res2.result
    _check("title mapped", g.title == "Conservation research")
    if g.custom_fields and g.custom_fields.agency_code:
        assert_type(g.custom_fields.agency_code.value, str)
        _check(
            "agency_code.value == 'HHS-123'",
            g.custom_fields.agency_code.value == "HHS-123",
        )
    back2 = functions_plugin.schemas.Opportunity.from_common(g)
    assert_type(back2, TransformResult[GrantsGovOpportunity])
    _check("from_common -> typed source", back2.result.agency_code == "HHS-123")

    # Scenario 3 -- declarative mappings, no custom fields
    print("Scenario 3 -- mappings, no custom fields")
    res3 = base_plugin.schemas.Opportunity.to_common(
        PassthroughModel.model_validate(_FLAT_SOURCE)
    )
    _check("title mapped", res3.result.title == "Conservation research")

    # Scenario 4 -- custom fields only, no transforms (schema-only)
    print("Scenario 4 -- custom fields only, no transforms")
    ext = opportunity_extensions.schemas.Opportunity
    assert_type(ext, SchemaOnly[Opportunity[ExtensionFields]])
    parsed = ext.parse(_SCHEMA_ONLY_RECORD)
    if parsed.custom_fields and parsed.custom_fields.legacy_grant_id:
        assert_type(parsed.custom_fields.legacy_grant_id.value, int)
        _check(
            "schema-only legacy_grant_id.value typed int == 98765",
            parsed.custom_fields.legacy_grant_id.value == 98765,
        )
    print("  inspect: resolved specs")
    for name, spec in ext.custom_fields.items():
        print(f"    {name}: {spec.field_type} -- {spec.description}")

    # Realistic combined plugin -- grants.gov (custom handler + round-trip)
    print("grants.gov -- custom fields + transform with a custom handler")
    res5 = grants_gov.schemas.Opportunity.to_common(
        PassthroughModel.model_validate(_GRANTS_GOV_SOURCE)
    )
    _check("no transform errors", not res5.errors)
    gg = res5.result
    _check("title mapped", gg.title == "Research into conservation techniques")
    if gg.custom_fields and gg.custom_fields.composite_label:
        _check(
            "compositeLabel joined via custom handler",
            gg.custom_fields.composite_label.value
            == "ABC-123-XYZ-001 -- Research into conservation techniques",
        )
    back5 = grants_gov.schemas.Opportunity.from_common(gg)
    assert_type(back5, TransformResult[PassthroughModel])
    native = back5.result.model_dump(by_alias=True)
    _check(
        "from_common -> validated source instance",
        native["data"]["opportunity_title"] == "Research into conservation techniques",
    )


if __name__ == "__main__":
    main()
