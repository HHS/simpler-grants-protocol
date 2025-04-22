"""Example usage of the CommonGrants models."""

from datetime import date, datetime, UTC
from uuid import uuid4

from common_grants.schemas.models import (
    OppFunding,
    OppStatus,
    OppStatusOptions,
    OppTimeline,
    OpportunityBase,
)
from common_grants.schemas.fields import Event, Money


def main():
    """Demonstrate usage of the CommonGrants models."""
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
                description="The date when applications will begin to be accepted"
            ),
            app_deadline=Event(
                name="Application Deadline",
                date=date(2024, 3, 31),
                description="The final date by which applications must be submitted"
            )
        )
    )

    # Convert to dictionary
    opp_dict = opportunity.dump()
    print("Opportunity as dictionary:")
    print(opp_dict)

    # Convert to JSON
    opp_json = opportunity.dump_json()
    print("\nOpportunity as JSON:")
    print(opp_json)

    # Create from dictionary
    loaded_opp = OpportunityBase.from_dict(opp_dict)
    print("\nLoaded opportunity from dictionary:")
    print(f"Title: {loaded_opp.title}")
    print(f"Status: {loaded_opp.status.value}")

    # Create from JSON
    loaded_opp_json = OpportunityBase.from_json(opp_json)
    print("\nLoaded opportunity from JSON:")
    print(f"Title: {loaded_opp_json.title}")
    print(f"Status: {loaded_opp_json.status.value}")


if __name__ == "__main__":
    main() 