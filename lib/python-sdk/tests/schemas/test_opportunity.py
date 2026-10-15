"""Tests for opportunity models, including the Core v0.5 identifiers and funders."""

import pytest
from datetime import datetime, date, UTC
from typing import get_args
from uuid import UUID, uuid4

from pydantic import ValidationError

from common_grants_sdk.schemas import (
    IdentifierStatus,
    OppIdAln,
    OppIdFon,
    OppIds,
    OrgRef,
    OrgRefCollection,
)

from common_grants_sdk.schemas.pydantic.fields import Money, EventType, SingleDateEvent
from common_grants_sdk.schemas.pydantic.models.opp_applicant_type import (
    ApplicantTypeOptions,
)
from common_grants_sdk.schemas.pydantic.models.opp_base import OpportunityBase
from common_grants_sdk.schemas.pydantic.models.opp_funding import OppFunding
from common_grants_sdk.schemas.pydantic.models.opp_status import (
    OppStatus,
    OppStatusOptions,
)
from common_grants_sdk.schemas.pydantic.models.opp_timeline import OppTimeline

from .opportunity_v05_fixtures import (
    FULL_OPPORTUNITY,
    FUNDERS,
    IDENTIFIERS,
    INVALID_ADDITIONS,
    MINIMAL_OPPORTUNITY,
    OPPORTUNITIES,
    OPPORTUNITY_ID,
    TypedOpportunity,
    wire,
)


@pytest.fixture
def sample_opportunity():
    """Create a sample opportunity for testing."""
    return OpportunityBase.model_validate(
        {
            "id": uuid4(),
            "title": "Research Grant 2024",
            "description": "Funding for innovative research projects",
            "status": {
                "value": OppStatusOptions.OPEN,
                "description": "This opportunity is currently accepting applications",
            },
            "createdAt": datetime.now(UTC),
            "lastModifiedAt": datetime.now(UTC),
            "funding": {
                "totalAmountAvailable": {"amount": "100000.00", "currency": "USD"},
                "minAwardAmount": {"amount": "10000.00", "currency": "USD"},
                "maxAwardAmount": {"amount": "50000.00", "currency": "USD"},
                "estimatedAwardCount": 5,
            },
            "keyDates": {
                "postDate": {
                    "name": "Application Posted",
                    "eventType": "singleDate",
                    "date": date(2024, 1, 1),
                    "description": "Applications posted",
                },
                "closeDate": {
                    "name": "Application Deadline",
                    "eventType": "singleDate",
                    "date": date(2024, 3, 31),
                    "description": "Applications close",
                },
            },
        }
    )


@pytest.fixture
def minimal_opportunity():
    """Create a minimal opportunity with only required fields."""
    return OpportunityBase.model_validate(
        {
            "id": uuid4(),
            "title": "Minimal Research Grant",
            "description": "Funding for innovative research projects",
            "status": {
                "value": OppStatusOptions.OPEN,
            },
            "createdAt": datetime.now(UTC),
            "lastModifiedAt": datetime.now(UTC),
        }
    )


def test_opportunity_timeline_validation(sample_opportunity):
    """Test opportunity timeline validation."""
    # Test that post_date is before close_date
    assert (
        sample_opportunity.key_dates.post_date.date
        < sample_opportunity.key_dates.close_date.date
    )

    # Test that dates are valid
    assert isinstance(sample_opportunity.key_dates.post_date.date, date)
    assert isinstance(sample_opportunity.key_dates.close_date.date, date)

    # Test that event names are not empty
    assert sample_opportunity.key_dates.post_date.name
    assert sample_opportunity.key_dates.close_date.name

    # Test that event types are correct
    assert sample_opportunity.key_dates.post_date.event_type == EventType.SINGLE_DATE
    assert sample_opportunity.key_dates.close_date.event_type == EventType.SINGLE_DATE


def test_minimal_opportunity_validation(minimal_opportunity):
    """Test that minimal opportunity with only required fields works."""
    assert minimal_opportunity.id is not None
    assert minimal_opportunity.title == "Minimal Research Grant"
    assert minimal_opportunity.description == "Funding for innovative research projects"
    assert minimal_opportunity.status.value == OppStatusOptions.OPEN
    assert minimal_opportunity.funding is None
    assert minimal_opportunity.key_dates is None
    assert minimal_opportunity.source is None
    assert minimal_opportunity.custom_fields is None


def test_optional_funding_fields():
    """Test that funding fields are optional."""
    funding = OppFunding(
        totalAmountAvailable=Money(amount="100000.00", currency="USD"),
        details="Additional funding information",
    )
    assert funding.total_amount_available is not None
    assert funding.details == "Additional funding information"
    assert funding.min_award_amount is None
    assert funding.max_award_amount is None
    assert funding.min_award_count is None
    assert funding.max_award_count is None
    assert funding.estimated_award_count is None


def test_optional_status_description():
    """Test that status description is optional."""
    status = OppStatus(value=OppStatusOptions.OPEN)
    assert status.value == OppStatusOptions.OPEN
    assert status.description is None
    assert status.custom_value is None

    status_with_desc = OppStatus(
        value=OppStatusOptions.OPEN,
        description="This opportunity is currently accepting applications",
    )
    assert (
        status_with_desc.description
        == "This opportunity is currently accepting applications"
    )


def test_optional_timeline_fields():
    """Test that timeline fields are optional."""
    timeline = OppTimeline()
    assert timeline.post_date is None
    assert timeline.close_date is None
    assert timeline.other_dates is None

    timeline_with_post = OppTimeline(
        postDate=SingleDateEvent(
            name="Application Posted",
            event_type=EventType.SINGLE_DATE,
            date=date(2024, 1, 1),
        )
    )
    assert timeline_with_post.post_date is not None
    assert timeline_with_post.close_date is None
    assert timeline_with_post.other_dates is None


def test_opportunity_with_custom_fields():
    """Test opportunity with custom fields."""
    from common_grants_sdk.schemas.pydantic.fields import CustomFieldType

    opportunity = OpportunityBase.model_validate(
        {
            "id": uuid4(),
            "title": "Custom Field Test",
            "description": "Testing custom fields",
            "status": {
                "value": OppStatusOptions.OPEN,
            },
            "createdAt": datetime.now(UTC),
            "lastModifiedAt": datetime.now(UTC),
            "customFields": {
                "programArea": {
                    "name": "programArea",
                    "fieldType": CustomFieldType.STRING,
                    "value": "Healthcare Innovation",
                    "description": "Primary focus area of the grant program",
                    "schema": "https://example.com/schema",
                }
            },
        }
    )

    assert opportunity.custom_fields is not None
    assert "programArea" in opportunity.custom_fields
    custom_field = opportunity.custom_fields["programArea"]
    assert custom_field.name == "programArea"
    assert custom_field.field_type == CustomFieldType.STRING
    assert custom_field.value == "Healthcare Innovation"
    assert str(custom_field.schema_url) == "https://example.com/schema"


class TestAcceptedApplicantTypes:
    def test_defaults_to_none(self, minimal_opportunity):
        assert minimal_opportunity.accepted_applicant_types is None

    def test_parses_list(self):
        opp = OpportunityBase.model_validate(
            {
                "id": str(uuid4()),
                "title": "Test",
                "description": "Test",
                "status": {"value": "open"},
                "createdAt": datetime.now(UTC).isoformat(),
                "lastModifiedAt": datetime.now(UTC).isoformat(),
                "acceptedApplicantTypes": [
                    {"value": "government_state"},
                    {"value": "individual"},
                ],
            }
        )
        assert len(opp.accepted_applicant_types) == 2
        assert (
            opp.accepted_applicant_types[0].value
            == ApplicantTypeOptions.government_state
        )
        assert opp.accepted_applicant_types[1].value == ApplicantTypeOptions.individual

    def test_rejects_invalid_applicant_type(self):
        with pytest.raises(ValidationError):
            OpportunityBase.model_validate(
                {
                    "id": str(uuid4()),
                    "title": "Test",
                    "description": "Test",
                    "status": {"value": "open"},
                    "createdAt": datetime.now(UTC).isoformat(),
                    "lastModifiedAt": datetime.now(UTC).isoformat(),
                    "acceptedApplicantTypes": [{"value": "not_valid"}],
                }
            )


# ############################################################
# Core v0.5 additions: identifiers and funders
# ############################################################


@pytest.mark.parametrize(
    "model", [OpportunityBase, TypedOpportunity], ids=["bare", "typed"]
)
@pytest.mark.parametrize("payload", OPPORTUNITIES.values(), ids=OPPORTUNITIES.keys())
def test_opportunity_fixtures_round_trip_unchanged(model, payload):
    opportunity = model.model_validate(payload)

    assert wire(opportunity) == payload
    assert (
        model.model_validate_json(
            opportunity.model_dump_json(by_alias=True, exclude_unset=True)
        )
        == opportunity
    )


def test_additions_reuse_the_shared_models():
    fields = OpportunityBase.model_fields

    assert get_args(fields["identifiers"].annotation) == (OppIds, type(None))
    assert get_args(fields["funders"].annotation) == (OrgRefCollection, type(None))


def test_additions_construct_from_public_types_with_exact_wire_keys():
    opportunity = TypedOpportunity(
        id=UUID(OPPORTUNITY_ID),
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
            primary=OrgRef(id=UUID(FUNDERS["primary"]["id"]), name="Primary agency"),
            other_orgs={
                "coFunder": OrgRef(
                    id=UUID(FUNDERS["otherOrgs"]["coFunder"]["id"]),
                    name="Partner agency",
                ),
            },
        ),
    )

    data = wire(opportunity)
    assert data["identifiers"] == {
        "opp:us:fon": {"id": "HHS-2026-001"},
        "opp:us:aln": {"id": "93.575"},
    }
    assert data["funders"] == {
        "primary": {"id": FUNDERS["primary"]["id"], "name": "Primary agency"},
        "otherOrgs": {
            "coFunder": {
                "id": FUNDERS["otherOrgs"]["coFunder"]["id"],
                "name": "Partner agency",
            }
        },
    }
    assert "customFields" not in data


def test_additions_parse_into_snake_case_attributes():
    opportunity = OpportunityBase.model_validate(FULL_OPPORTUNITY)

    identifiers = opportunity.identifiers
    assert isinstance(identifiers, OppIds)
    assert identifiers.system_id is not None
    assert identifiers.system_id.id == UUID(OPPORTUNITY_ID)
    assert identifiers.opp_us_fon is not None
    assert identifiers.opp_us_fon.id == "HHS-2026-ACF-OCC-YD-0001"
    assert identifiers.opp_us_fon.all_ids is not None
    assert [v.status for v in identifiers.opp_us_fon.all_ids] == [
        IdentifierStatus.ACTIVE,
        IdentifierStatus.ARCHIVED,
    ]
    assert identifiers.opp_us_aln is not None
    assert identifiers.opp_us_aln.registry is not None
    assert identifiers.opp_us_aln.registry.code == "opp:us:aln"
    assert identifiers.other_ids is not None
    assert identifiers.other_ids["opp:grants.gov:number"].id == "359123"

    funders = opportunity.funders
    assert isinstance(funders, OrgRefCollection)
    assert funders.primary.name == "Health Resources and Services Administration"
    assert funders.other_orgs is not None
    assert list(funders.other_orgs) == ["coFunder", "pass_through"]
    pass_through = funders.other_orgs["pass_through"]
    assert pass_through.identifiers is not None
    assert pass_through.identifiers.org_us_uei is not None
    assert pass_through.identifiers.org_us_uei.id == "ABCDEFGH1234"


@pytest.mark.parametrize(
    "payload, absent",
    [
        (MINIMAL_OPPORTUNITY, ("identifiers", "funders")),
        (OPPORTUNITIES["identifiers only"], ("funders",)),
        (OPPORTUNITIES["funders only"], ("identifiers",)),
    ],
    ids=["both absent", "funders absent", "identifiers absent"],
)
def test_absent_additions_default_to_none_and_stay_omitted(payload, absent):
    opportunity = OpportunityBase.model_validate(payload)
    data = wire(opportunity)

    for key in absent:
        assert getattr(opportunity, key) is None
        assert key not in data


@pytest.mark.parametrize("model", [OpportunityBase, TypedOpportunity])
@pytest.mark.parametrize("field", ["identifiers", "funders"])
def test_explicit_null_additions_are_rejected(model, field):
    for payload in (
        {**MINIMAL_OPPORTUNITY, field: None},
        {**_snake_case(MINIMAL_OPPORTUNITY), field: None},
    ):
        with pytest.raises(ValidationError, match="must be omitted, not null"):
            model.model_validate(payload)
    with pytest.raises(ValidationError, match="must be omitted, not null"):
        model(**_snake_case(MINIMAL_OPPORTUNITY), **{field: None})


@pytest.mark.parametrize("model", [OpportunityBase, TypedOpportunity])
@pytest.mark.parametrize(
    "payload", INVALID_ADDITIONS.values(), ids=INVALID_ADDITIONS.keys()
)
def test_invalid_additions_are_rejected(model, payload):
    with pytest.raises(ValidationError):
        model.model_validate(payload)


@pytest.mark.parametrize(
    "field", ["funding", "keyDates", "source", "customFields", "acceptedApplicantTypes"]
)
def test_existing_optional_fields_keep_accepting_null(field):
    opportunity = OpportunityBase.model_validate({**FULL_OPPORTUNITY, field: None})

    assert wire(opportunity)[field] is None


def test_required_custom_field_null_value_survives_the_wire_recipe():
    payload = OPPORTUNITIES["custom fields with both additions"]
    opportunity = TypedOpportunity.model_validate(payload)

    assert opportunity.custom_fields is not None
    assert opportunity.custom_fields.priority_score is not None
    assert opportunity.custom_fields.priority_score.value == 7
    data = wire(opportunity)
    assert data["customFields"]["reviewNote"]["value"] is None
    assert data["identifiers"] == IDENTIFIERS
    assert data["funders"] == FUNDERS


def _snake_case(payload: dict) -> dict:
    return {
        "id": payload["id"],
        "title": payload["title"],
        "description": payload["description"],
        "status": payload["status"],
        "created_at": payload["createdAt"],
        "last_modified_at": payload["lastModifiedAt"],
    }


def test_typed_opportunities_example_runs():
    from examples.typed_opportunities_v05 import main

    main()


def test_non_wire_round_trips_reject_and_the_wire_recipe_converts():
    opp = OpportunityBase.model_validate(MINIMAL_OPPORTUNITY)

    for attempt in (
        lambda: OpportunityBase.model_validate(opp.model_dump()),
        lambda: OpportunityBase.from_json(opp.dump_json()),
        lambda: TypedOpportunity.model_validate(opp),
    ):
        with pytest.raises(ValidationError, match="must be omitted, not null"):
            attempt()

    assert OpportunityBase.model_validate(wire(opp)) == opp
    payload = OPPORTUNITIES["custom fields with both additions"]
    typed = TypedOpportunity.model_validate(
        wire(OpportunityBase.model_validate(payload))
    )
    assert wire(typed) == payload
