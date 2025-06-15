"""
Test module for date transformation functionality.

This module contains tests for the transform_generic_date method in the OpportunityTransformer class.
"""

import pytest
from datetime import datetime

from ca_common_grants.utils.opp_transform import OpportunityTransformer, DateFormat


class TestTransformGenericDate:
    """Test the transform_generic_date method."""

    def setup_method(self):
        """Set up test cases."""
        self.transformer = OpportunityTransformer()

    def test_ongoing_with_full_datetime(self):
        """Test Ongoing case with FULL_DATETIME format."""
        result = self.transformer.transform_generic_date(
            "Ongoing", DateFormat.FULL_DATETIME
        )
        expected = datetime(2099, 12, 31, 23, 59, 59)
        assert result == expected

    def test_ongoing_with_date(self):
        """Test Ongoing case with DATE format."""
        result = self.transformer.transform_generic_date("Ongoing", DateFormat.DATE)
        expected = datetime(2099, 12, 31)
        assert result == expected

    def test_iso_format_with_full_datetime(self):
        """Test ISO format input with FULL_DATETIME output."""
        result = self.transformer.transform_generic_date(
            "2025-06-10 07:00:00", DateFormat.FULL_DATETIME
        )
        expected = datetime(2025, 6, 10, 7, 0, 0)
        assert result == expected

    def test_iso_format_with_date(self):
        """Test ISO format input with DATE output."""
        result = self.transformer.transform_generic_date(
            "2025-06-10 07:00:00", DateFormat.DATE
        )
        expected = datetime(2025, 6, 10)
        assert result == expected

    def test_mmddyy_format_with_full_datetime(self):
        """Test MM/DD/YY format input with FULL_DATETIME output."""
        result = self.transformer.transform_generic_date(
            "12/31/25", DateFormat.FULL_DATETIME
        )
        expected = datetime(2025, 12, 31, 23, 59, 59)
        assert result == expected

    def test_mmddyy_format_with_date(self):
        """Test MM/DD/YY format input with DATE output."""
        result = self.transformer.transform_generic_date("12/31/25", DateFormat.DATE)
        expected = datetime(2025, 12, 31)
        assert result == expected

    def test_invalid_format(self):
        """Test invalid date format."""
        with pytest.raises(ValueError, match="Unrecognized date format"):
            self.transformer.transform_generic_date("invalid-date", DateFormat.DATE)

    def test_empty_string(self):
        """Test empty string input."""
        with pytest.raises(ValueError, match="Unrecognized date format"):
            self.transformer.transform_generic_date("", DateFormat.DATE)

    def test_none_input(self):
        """Test None input."""
        with pytest.raises(ValueError, match="Unrecognized date format"):
            self.transformer.transform_generic_date(None, DateFormat.DATE)
