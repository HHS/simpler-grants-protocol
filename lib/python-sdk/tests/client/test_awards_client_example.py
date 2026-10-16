"""The awards_client example runs offline and shows every channel it documents."""

from common_grants_sdk.schemas.pydantic.models import AwardBase
from examples.awards_client import (
    AWARD_ID,
    Recipient,
    ScholarshipRecipient,
    TypedAward,
    demo,
    scholarship_year,
)


def test_awards_client_example_runs_offline():
    outcome = demo()

    assert outcome.search_body == {
        "search": "research",
        "filters": {
            "status": {"operator": "in", "value": ["awarded"]},
            "opportunityId": {
                "operator": "in",
                "value": ["00000000-0000-4000-8000-000000000001"],
            },
            "awardDateRange": {
                "operator": "between",
                "value": {"min": "2026-01-01", "max": "2026-12-31"},
            },
            "awardedAmountRange": {
                "operator": "between",
                "value": {
                    "min": {"amount": "10000", "currency": "USD"},
                    "max": {"amount": "500000", "currency": "USD"},
                },
            },
            "customFilters": {
                "program_code": {"operator": "in", "value": ["RESEARCH"]},
                "experimental_tag": {"operator": "eq", "value": "pilot"},
            },
        },
        "pagination": {"page": 2, "pageSize": 25},
    }
    assert [str(award.id) for award in outcome.search.items] == [AWARD_ID]
    assert [failure.index for failure in outcome.listed.errors] == [1]
    assert outcome.filter_error_path == "filters.program_code"
    assert outcome.missing_status == 404
    assert all(type(award) is TypedAward for award in outcome.search.items)
    assert [scholarship_year(award) for award in outcome.search.items] == [2026]
    assert type(outcome.award) is TypedAward and scholarship_year(outcome.award) == 2026
    assert type(outcome.base_award) is AwardBase
    recipient = outcome.base_award.recipient_individual
    assert recipient is not None and recipient.custom_fields is not None
    assert recipient.custom_fields["scholarshipYear"].value == 2026
    assert outcome.to_common.errors == []
    assert isinstance(outcome.to_common.result, Recipient)
    assert outcome.from_common.errors == []
    assert outcome.from_common.result == ScholarshipRecipient(
        first_name="Ada", last_name="Lovelace", award_year=2026
    )
