"""Tests for opportunity data source utilities."""

import tempfile
from pathlib import Path

import pytest

from ca_common_grants.utils.opp_data_source import OpportunityDataSource


def test_get_opportunities() -> None:
    """Test fetch opportunity data."""
    opportunities = OpportunityDataSource.get_opportunities()
    assert isinstance(opportunities, list)
    assert len(opportunities) > 0

    # Check structure of first opportunity
    first_opp = opportunities[0]
    assert isinstance(first_opp, dict)
    assert "Title" in first_opp
    assert "Status" in first_opp
    assert "LastUpdated" in first_opp


def test_get_opportunities_invalid_file() -> None:
    """Test fetch opportunity data with invalid file."""
    # Temporarily modify the data file path to point to a non-existent file
    original_path = OpportunityDataSource.DATA_FILE
    OpportunityDataSource.DATA_FILE = Path("non_existent_file.json")
    try:
        with pytest.raises(ValueError, match="Error processing file"):
            OpportunityDataSource.get_opportunities()
    finally:
        OpportunityDataSource.DATA_FILE = original_path


def test_get_opportunities_invalid_json() -> None:
    """Test fetch opportunity data with invalid JSON."""
    # Create a temporary file with invalid JSON
    with tempfile.NamedTemporaryFile(delete=False, mode="w") as tmp:
        tmp.write("{invalid json}")
        tmp_path = tmp.name
    original_path = OpportunityDataSource.DATA_FILE
    OpportunityDataSource.DATA_FILE = Path(tmp_path)
    try:
        with pytest.raises(ValueError, match="Invalid JSON"):
            OpportunityDataSource.get_opportunities()
    finally:
        OpportunityDataSource.DATA_FILE = original_path
        Path(tmp_path).unlink()
