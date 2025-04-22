"""Example usage of the CommonGrants application and award models."""

from datetime import date, datetime, UTC
from uuid import uuid4

from common_grants.schemas.fields import Money, Event
from common_grants.schemas.models import (
    ApplicationBase,
    ApplicationStatus,
    ApplicationStatusOptions,
    AwardBase,
    AwardStatus,
    AwardStatusOptions,
    Contact,
    OpportunityBase,
    OppFunding,
    OppStatus,
    OppStatusOptions,
    OppTimeline,
)


def main():
    """Demonstrate usage of the CommonGrants application and award models."""
    # Create a contact
    contact = Contact(
        name="Jane Smith",
        email="jane.smith@example.com",
        phone="+1-555-123-4567",
        title="Research Director",
        organization="Example Research Institute"
    )

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

    # Create an application
    application = ApplicationBase(
        id=uuid4(),
        opportunity_id=opportunity.id,
        applicant_id=uuid4(),
        status=ApplicationStatus(
            value=ApplicationStatusOptions.SUBMITTED,
            description="Application has been submitted and is under review"
        ).value,
        submitted_at=datetime.now(UTC),
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
        amount_requested=Money(amount="25000.00", currency="USD"),
        contact=contact,
        documents=[]
    )

    # Create an award
    award = AwardBase(
        id=uuid4(),
        application_id=application.id,
        opportunity_id=opportunity.id,
        recipient_id=application.applicant_id,
        status=AwardStatus(
            value=AwardStatusOptions.ACTIVE,
            description="Award is active and funding has been disbursed"
        ).value,
        amount=Money(amount="20000.00", currency="USD"),
        start_date=datetime.now(UTC),
        end_date=datetime(2025, 12, 31, tzinfo=UTC),
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
        contact=contact,
        documents=[]
    )

    # Convert to dictionary
    app_dict = application.dump()
    print("Application as dictionary:")
    print(app_dict)

    award_dict = award.dump()
    print("\nAward as dictionary:")
    print(award_dict)

    # Convert to JSON
    app_json = application.dump_json()
    print("\nApplication as JSON:")
    print(app_json)

    award_json = award.dump_json()
    print("\nAward as JSON:")
    print(award_json)

    # Create from dictionary
    loaded_app = ApplicationBase.from_dict(app_dict)
    print("\nLoaded application from dictionary:")
    print(f"ID: {loaded_app.id}")
    print(f"Status: {loaded_app.status}")

    loaded_award = AwardBase.from_dict(award_dict)
    print("\nLoaded award from dictionary:")
    print(f"ID: {loaded_award.id}")
    print(f"Status: {loaded_award.status}")

    # Create from JSON
    loaded_app_json = ApplicationBase.from_json(app_json)
    print("\nLoaded application from JSON:")
    print(f"ID: {loaded_app_json.id}")
    print(f"Status: {loaded_app_json.status}")

    loaded_award_json = AwardBase.from_json(award_json)
    print("\nLoaded award from JSON:")
    print(f"ID: {loaded_award_json.id}")
    print(f"Status: {loaded_award_json.status}")


if __name__ == "__main__":
    main() 