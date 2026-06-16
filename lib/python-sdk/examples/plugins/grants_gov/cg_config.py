"""Grants.gov sample plugin — bidirectional transform PoC.

Demonstrates the plugin framework shape using the grants.gov scenario.

Usage (from lib/python-sdk/):
    poetry run python examples/transforms.py

Code generation (generates typed custom-field schemas):
    poetry run python -m common_grants_sdk.extensions.generate --plugin examples/plugins/grants_gov
"""

from typing import Any

from common_grants_sdk.extensions import (
    CustomFieldSpec,
    PluginExtensionsMeta,
    SchemaInput,
    build_transforms,
    define_plugin,
)
from common_grants_sdk.schemas.pydantic.fields import CustomFieldType
from common_grants_sdk.utils.transformation import get_from_path


def _join_fields(data: dict[str, Any], spec: dict[str, Any]) -> str | None:
    sep = spec.get("sep", " ")
    parts = [get_from_path(data, path) for path in spec.get("fields", [])]
    values = [str(p) for p in parts if p is not None]
    return sep.join(values) if values else None


# ---------------------------------------------------------------------------
# Bidirectional transforms
#
# Both directions are author-provided — build_transforms() does not invert
# one into the other because many-to-one handlers like switch are not
# reversible.
#
# Convention: field extraction uses {"field": "dot.notation.path"} — bare
# string values are treated as literals by transform_from_mapping(), not
# as field paths. See Design Finding #2 in the spec for the open question
# about which convention is canonical.
# ---------------------------------------------------------------------------

to_common, from_common = build_transforms(
    handlers={"join": _join_fields},
    # to_common: grants.gov native → CommonGrants Opportunity
    to_common_mapping={
        "title": {"field": "data.opportunity_title"},
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
                "amount": {"field": "data.summary.award_floor"},
                "currency": {"const": "USD"},
            },
            "maxAwardAmount": {
                "amount": {"field": "data.summary.award_ceiling"},
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
            },
            "priorityScore": {
                "value": {"stringToNumber": "data.priority_score_str"},
            },
            "compositeLabel": {
                "value": {
                    "join": {
                        "fields": ["data.opportunity_number", "data.opportunity_title"],
                        "sep": " — ",
                    }
                },
            },
        },
    },
    # from_common: CommonGrants Opportunity → grants.gov native
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
                "award_floor": {"field": "funding.minAwardAmount.amount"},
                "award_ceiling": {"field": "funding.maxAwardAmount.amount"},
                "forecasted_post_date": {"field": "keyDates.appOpens.date"},
                "forecasted_close_date": {"field": "keyDates.appDeadline.date"},
            },
            "priority_score_str": {
                "numberToString": "customFields.priorityScore.value"
            },
        }
    },
)

# ---------------------------------------------------------------------------
# Plugin config
# ---------------------------------------------------------------------------

config = define_plugin(
    meta=PluginExtensionsMeta(
        name="grants-gov",
        version="0.1.0",
        sourceSystem="grants.gov",
        capabilities=["customFields", "transforms"],
    ),
    schemas={
        "Opportunity": SchemaInput(
            custom_fields={
                "legacyId": CustomFieldSpec(
                    field_type=CustomFieldType.INTEGER,
                    name="Legacy ID",
                    description="Unique identifier in legacy database",
                ),
                "legacyIdStr": CustomFieldSpec(
                    field_type=CustomFieldType.STRING,
                    name="Legacy ID (string)",
                    description="Legacy ID coerced to a string via numberToString",
                ),
                "agencyName": CustomFieldSpec(
                    field_type=CustomFieldType.STRING,
                    name="Agency",
                    description="Agency hosting the opportunity",
                ),
                "applicantTypes": CustomFieldSpec(
                    field_type=CustomFieldType.ARRAY,
                    name="Applicant types",
                    description="Types of applicants eligible to apply",
                ),
                "priorityScore": CustomFieldSpec(
                    field_type=CustomFieldType.NUMBER,
                    name="Priority score",
                    description="Numeric priority score coerced from a string via stringToNumber",
                ),
                "compositeLabel": CustomFieldSpec(
                    field_type=CustomFieldType.STRING,
                    name="Composite label",
                    description="Composite label '<opportunity_number> — <opportunity_title>' for round-trip recovery",
                ),
            },
            to_common=to_common,
            from_common=from_common,
        )
    },
)
