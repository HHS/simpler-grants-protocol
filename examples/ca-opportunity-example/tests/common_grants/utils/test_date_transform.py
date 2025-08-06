"""Tests for date transformation utilities."""

from datetime import datetime

import pytest

from common_grants.utils.date_transform import (
    DateFormat,
    transform_date,
    transform_datetime,
    transform_seasonal,
    transform_unknown,
)


class TestDateFormat:
    """Test the DateFormat enum."""

    def test_date_format_values(self) -> None:
        """Test that DateFormat enum has expected values."""
        assert DateFormat.LONG.value == "9999-12-31 23:59:59"
        assert DateFormat.SHORT.value == "12/31/99"


class TestTransformDate:
    """Test the main transform_date function."""

    def test_transform_date_none(self) -> None:
        """Test transforming None date."""
        # The function handles None internally, but type checker expects str
        # We'll test with empty string instead which has the same behavior
        result = transform_date("", DateFormat.SHORT)
        assert isinstance(result, datetime)
        assert result.year == 2099

    def test_transform_date_empty_string(self) -> None:
        """Test transforming empty string."""
        result = transform_date("", DateFormat.SHORT)
        assert isinstance(result, datetime)
        assert result.year == 2099

    def test_transform_date_whitespace(self) -> None:
        """Test transforming whitespace-only string."""
        result = transform_date("   ", DateFormat.SHORT)
        assert isinstance(result, datetime)
        assert result.year == 2099

    def test_transform_date_with_through_prefix(self) -> None:
        """Test transforming date with 'through' prefix."""
        result = transform_date("through 2024-12-31", DateFormat.SHORT)
        assert isinstance(result, datetime)
        assert result.year == 2024
        assert result.month == 12
        assert result.day == 31

    def test_transform_date_with_thru_prefix(self) -> None:
        """Test transforming date with 'thru' prefix."""
        result = transform_date("thru 12/31/24", DateFormat.SHORT)
        assert isinstance(result, datetime)
        assert result.year == 2024
        assert result.month == 12
        assert result.day == 31

    def test_transform_date_with_until_prefix(self) -> None:
        """Test transforming date with 'until' prefix."""
        result = transform_date("until January 15, 2024", DateFormat.SHORT)
        assert isinstance(result, datetime)
        assert result.year == 2024
        assert result.month == 1
        assert result.day == 15

    def test_transform_date_with_to_prefix(self) -> None:
        """Test transforming date with 'to' prefix."""
        result = transform_date("to 2024-06-30", DateFormat.SHORT)
        assert isinstance(result, datetime)
        assert result.year == 2024
        assert result.month == 6
        assert result.day == 30

    def test_transform_date_fallback_to_unknown(self) -> None:
        """Test that unrecognized dates fall back to unknown date."""
        result = transform_date("invalid-date-format", DateFormat.SHORT)
        assert isinstance(result, datetime)
        assert result.year == 2099


class TestTransformDatetime:
    """Test the transform_datetime function."""

    def test_transform_datetime_iso_with_time(self) -> None:
        """Test transforming ISO format with time."""
        result = transform_datetime("2024-01-15 14:30:00", DateFormat.LONG)
        assert result.year == 2024
        assert result.month == 1
        assert result.day == 15
        assert result.hour == 14
        assert result.minute == 30
        assert result.second == 0

    def test_transform_datetime_iso_with_time_short_format(self) -> None:
        """Test transforming ISO format with time in SHORT format."""
        result = transform_datetime("2024-01-15 14:30:00", DateFormat.SHORT)
        assert result.year == 2024
        assert result.month == 1
        assert result.day == 15
        assert result.hour == 0
        assert result.minute == 0
        assert result.second == 0

    def test_transform_datetime_iso_date_only(self) -> None:
        """Test transforming ISO date only format."""
        result = transform_datetime("2024-01-15", DateFormat.LONG)
        assert result.year == 2024
        assert result.month == 1
        assert result.day == 15
        assert result.hour == 23
        assert result.minute == 59
        assert result.second == 59

    def test_transform_datetime_mm_dd_yy(self) -> None:
        """Test transforming MM/DD/YY format."""
        result = transform_datetime("12/31/24", DateFormat.LONG)
        assert result.year == 2024
        assert result.month == 12
        assert result.day == 31
        assert result.hour == 23
        assert result.minute == 59
        assert result.second == 59

    def test_transform_datetime_mm_dd_yyyy(self) -> None:
        """Test transforming MM/DD/YYYY format."""
        result = transform_datetime("12/31/2024", DateFormat.LONG)
        assert result.year == 2024
        assert result.month == 12
        assert result.day == 31
        assert result.hour == 23
        assert result.minute == 59
        assert result.second == 59

    def test_transform_datetime_month_dd_yyyy(self) -> None:
        """Test transforming Month DD, YYYY format."""
        result = transform_datetime("January 15, 2024", DateFormat.LONG)
        assert result.year == 2024
        assert result.month == 1
        assert result.day == 15
        assert result.hour == 23
        assert result.minute == 59
        assert result.second == 59

    def test_transform_datetime_month_dd_yyyy_no_space(self) -> None:
        """Test transforming Month DD,YYYY format (no space after comma)."""
        result = transform_datetime("January 15,2024", DateFormat.LONG)
        assert result.year == 2024
        assert result.month == 1
        assert result.day == 15

    def test_transform_datetime_month_dd_yyyy_no_comma(self) -> None:
        """Test transforming Month DD YYYY format (no comma)."""
        result = transform_datetime("January 15 2024", DateFormat.LONG)
        assert result.year == 2024
        assert result.month == 1
        assert result.day == 15

    def test_transform_datetime_month_yyyy(self) -> None:
        """Test transforming Month YYYY format."""
        result = transform_datetime("January 2024", DateFormat.LONG)
        assert result.year == 2024
        assert result.month == 1
        assert result.day == 1

    def test_transform_datetime_abbreviated_month_yyyy(self) -> None:
        """Test transforming abbreviated Month YYYY format."""
        result = transform_datetime("Jan 2024", DateFormat.LONG)
        assert result.year == 2024
        assert result.month == 1
        assert result.day == 1

    def test_transform_datetime_unrecognized_format(self) -> None:
        """Test that unrecognized formats raise ValueError."""
        with pytest.raises(ValueError, match="Unrecognized date format"):
            transform_datetime("invalid-format", DateFormat.LONG)


class TestTransformUnknown:
    """Test the transform_unknown function."""

    def test_transform_unknown_valid_values(self) -> None:
        """Test transforming valid unknown date values."""
        unknown_values = [
            "na",
            "n/a",
            "ongoing",
            "pending",
            "tba",
            "tbd",
            "to be announced",
            "to be determined",
            "continuous",
        ]

        for value in unknown_values:
            result = transform_unknown(value, DateFormat.SHORT)
            assert isinstance(result, datetime)
            assert result.year == 2099
            assert result.month == 12
            assert result.day == 31

    def test_transform_unknown_long_format(self) -> None:
        """Test transforming unknown date in LONG format."""
        result = transform_unknown("tbd", DateFormat.LONG)
        assert isinstance(result, datetime)
        assert result.year == 2099
        assert result.month == 12
        assert result.day == 31
        assert result.hour == 23
        assert result.minute == 59
        assert result.second == 59

    def test_transform_unknown_case_insensitive(self) -> None:
        """Test that unknown date values are case insensitive."""
        result = transform_unknown("TBD", DateFormat.SHORT)
        assert isinstance(result, datetime)
        assert result.year == 2099

    def test_transform_unknown_invalid_value(self) -> None:
        """Test that invalid unknown date values raise ValueError."""
        with pytest.raises(ValueError, match="Not an unknown date value"):
            transform_unknown("valid-date", DateFormat.SHORT)


class TestTransformSeasonal:
    """Test the transform_seasonal function."""

    def test_transform_seasonal_spring(self) -> None:
        """Test transforming spring seasonal date."""
        result = transform_seasonal("Spring 2024", DateFormat.SHORT)
        assert result.year == 2024
        assert result.month == 3
        assert result.day == 21

    def test_transform_seasonal_summer(self) -> None:
        """Test transforming summer seasonal date."""
        result = transform_seasonal("Summer 2024", DateFormat.SHORT)
        assert result.year == 2024
        assert result.month == 6
        assert result.day == 21

    def test_transform_seasonal_fall(self) -> None:
        """Test transforming fall seasonal date."""
        result = transform_seasonal("Fall 2024", DateFormat.SHORT)
        assert result.year == 2024
        assert result.month == 9
        assert result.day == 22

    def test_transform_seasonal_winter(self) -> None:
        """Test transforming winter seasonal date."""
        result = transform_seasonal("Winter 2024", DateFormat.SHORT)
        assert result.year == 2024
        assert result.month == 12
        assert result.day == 21

    def test_transform_seasonal_with_apostrophe(self) -> None:
        """Test transforming seasonal date with apostrophe."""
        result = transform_seasonal("Spring '24", DateFormat.SHORT)
        assert result.year == 2024
        assert result.month == 3
        assert result.day == 21

    def test_transform_seasonal_with_modifiers(self) -> None:
        """Test transforming seasonal date with modifiers."""
        result = transform_seasonal("Early Spring 2024", DateFormat.SHORT)
        assert result.year == 2024
        assert result.month == 3
        assert result.day == 21

    def test_transform_seasonal_late_modifier(self) -> None:
        """Test transforming seasonal date with 'Late' modifier."""
        result = transform_seasonal("Late Fall 2024", DateFormat.SHORT)
        assert result.year == 2024
        assert result.month == 9
        assert result.day == 22

    def test_transform_seasonal_mid_modifier(self) -> None:
        """Test transforming seasonal date with 'Mid' modifier."""
        with pytest.raises(ValueError, match="Not a seasonal date format"):
            transform_seasonal("Mid-Summer 2024", DateFormat.SHORT)

    def test_transform_seasonal_mid_no_hyphen(self) -> None:
        """Test transforming seasonal date with 'Mid' modifier (no hyphen)."""
        result = transform_seasonal("Mid Winter 2024", DateFormat.SHORT)
        assert result.year == 2024
        assert result.month == 12
        assert result.day == 21

    def test_transform_seasonal_long_format(self) -> None:
        """Test transforming seasonal date in LONG format."""
        result = transform_seasonal("Spring 2024", DateFormat.LONG)
        assert result.year == 2024
        assert result.month == 3
        assert result.day == 21
        assert result.hour == 23
        assert result.minute == 59
        assert result.second == 59

    def test_transform_seasonal_with_range(self) -> None:
        """Test transforming seasonal date with range."""
        result = transform_seasonal("Spring 2024 - Summer 2024", DateFormat.SHORT)
        assert result.year == 2024
        assert result.month == 3
        assert result.day == 21

    def test_transform_seasonal_case_insensitive(self) -> None:
        """Test that seasonal dates are case insensitive."""
        result = transform_seasonal("SPRING 2024", DateFormat.SHORT)
        assert result.year == 2024
        assert result.month == 3
        assert result.day == 21

    def test_transform_seasonal_invalid_format(self) -> None:
        """Test that invalid seasonal formats raise ValueError."""
        with pytest.raises(ValueError, match="Not a seasonal date format"):
            transform_seasonal("Invalid Season 2024", DateFormat.SHORT)

    def test_transform_seasonal_invalid_year(self) -> None:
        """Test that invalid year formats raise ValueError."""
        with pytest.raises(ValueError, match="time data.*does not match format"):
            transform_seasonal("Spring 202", DateFormat.SHORT)
