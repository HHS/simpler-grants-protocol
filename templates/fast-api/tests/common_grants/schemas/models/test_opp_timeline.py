"""Tests for the OppTimeline model."""

from datetime import date, time

from common_grants_sdk.schemas.fields import EventType
from common_grants_sdk.schemas.models import OppTimeline


def test_opp_timeline_model():
    """Test the OppTimeline model."""
    timeline_data = {
        "postDate": {
            "name": "Application Opens",
            "eventType": EventType.SINGLE_DATE,
            "date": date(2024, 1, 1),
            "time": None,
            "description": "Start accepting applications",
        },
        "closeDate": {
            "name": "Application Deadline",
            "eventType": EventType.SINGLE_DATE,
            "date": date(2024, 12, 31),
            "time": time(23, 59, 59),
            "description": "Final deadline for submissions",
        },
        "otherDates": {
            "review_start": {
                "name": "Review Start",
                "eventType": EventType.SINGLE_DATE,
                "date": date(2025, 1, 1),
                "time": None,
                "description": "Start of application review process",
            },
        },
    }
    timeline = OppTimeline.model_validate(timeline_data, strict=False)

    assert timeline.post_date is not None
    # Cast to SingleDateEvent to access date attribute
    from common_grants_sdk.schemas.fields import SingleDateEvent

    assert isinstance(timeline.post_date, SingleDateEvent)
    assert timeline.post_date.date == date(2024, 1, 1)
    assert timeline.close_date is not None
    assert isinstance(timeline.close_date, SingleDateEvent)
    assert timeline.close_date.time == time(23, 59, 59)
    assert timeline.other_dates is not None
    assert "review_start" in timeline.other_dates
