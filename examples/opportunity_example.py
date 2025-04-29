"""Example demonstrating the Opportunity model usage."""

from datetime import date, datetime, UTC
from uuid import uuid4
import json

from common_grants_sdk.schemas.models.opp_base import OpportunityBase
from common_grants_sdk.schemas.models.opp_status import OppStatus, OppStatusOptions
from common_grants_sdk.schemas.models.opp_timeline import OppTimeline
from common_grants_sdk.schemas.models.opp_funding import OppFunding
from common_grants_sdk.schemas.fields import Money, Event


def main():
    """Run the opportunity example."""
    # Create an opportunity
    opportunity = OpportunityBase(
        id=uuid4(),
        title="Research Grant 2024",
        description="Funding for innovative research projects in renewable energy",
        status=OppStatus(
            value=OppStatusOptions.OPEN,
            description="This opportunity is currently accepting applications"
        ),
        created_at=datetime.now(UTC),
        last_modified_at=datetime.now(UTC),
        funding=OppFunding(
            total_amount_available=Money(amount="50000.00", currency="USD"),
            min_award_amount=Money(amount="10000.00", currency="USD"),
            max_award_amount=Money(amount="50000.00", currency="USD"),
            estimated_award_count=5
        ),
        key_dates=OppTimeline(
            app_opens=Event(
                name="Application Opens",
                date=date(2024, 1, 1),
                description="Start accepting applications"
            ),
            app_deadline=Event(
                name="Application Deadline",
                date=date(2024, 3, 31),
                description="Deadline for submitting applications"
            ),
            other_dates={
                "awards_announced": Event(
                    name="Awards Announced",
                    date=date(2024, 6, 1),
                    description="Successful applicants will be notified"
                )
            }
        )
    )

    # Serialize to dictionary
    opp_dict = opportunity.model_dump()
    print("\nOpportunity as dictionary:")
    print(json.dumps(opp_dict, indent=2, default=str))

    # Serialize to JSON
    opp_json = opportunity.model_dump_json()
    print("\nOpportunity as JSON:")
    print(opp_json)

    # Deserialize from dictionary
    opp_from_dict = OpportunityBase.model_validate(opp_dict)
    print("\nOpportunity deserialized from dictionary:")
    print(opp_from_dict)

    # Deserialize from JSON
    opp_from_json = OpportunityBase.model_validate_json(opp_json)
    print("\nOpportunity deserialized from JSON:")
    print(opp_from_json)


if __name__ == "__main__":
    main() 