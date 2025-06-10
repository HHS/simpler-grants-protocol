"""Tests for the OppTimeline model."""

from datetime import date, time

from common_grants_sdk.schemas.models import OppTimeline


def test_opp_timeline_model():
    """Test the OppTimeline model."""
    timeline_data = {
        "appOpens": {
            "name": "Application Opens",
            "date": date(2024, 1, 1),
            "time": None,
            "description": "Start accepting applications",
        },
        "appDeadline": {
            "name": "Application Deadline",
            "date": date(2024, 12, 31),
            "time": time(23, 59, 59),
            "description": "Final deadline for submissions",
        },
        "otherDates": {
            "review_start": {
                "name": "Review Start",
                "date": date(2025, 1, 1),
                "time": None,
                "description": "Start of application review process",
            },
        },
    }
    timeline = OppTimeline.model_validate(timeline_data, strict=False)

    assert timeline.app_opens is not None
    assert timeline.app_opens.date == date(2024, 1, 1)
    assert timeline.app_deadline is not None
    assert timeline.app_deadline.time == time(23, 59, 59)
    assert timeline.other_dates is not None
    assert "review_start" in timeline.other_dates
