"""Tests for opportunity data extraction utilities."""

import json
import tempfile
from pathlib import Path

import pytest

from ca_common_grants.utils.opp_extract import OpportunityExtractor


def test_extract_opportunities() -> None:
    """Test opportunity data extraction."""
    opportunities = OpportunityExtractor.extract_opportunities()
    assert isinstance(opportunities, list)
    assert len(opportunities) > 0

    # Check structure of first opportunity
    first_opp = opportunities[0]
    assert isinstance(first_opp, dict)
    assert "Title" in first_opp
    assert "Status" in first_opp
    assert "LastUpdated" in first_opp


def test_extract_opportunities_invalid_file() -> None:
    """Test opportunity data extraction with invalid file."""
    # Temporarily modify the data file path to point to a non-existent file
    original_path = OpportunityExtractor.DATA_FILE
    OpportunityExtractor.DATA_FILE = Path("non_existent_file.json")
    try:
        with pytest.raises(FileNotFoundError):
            OpportunityExtractor.extract_opportunities()
    finally:
        OpportunityExtractor.DATA_FILE = original_path


def test_extract_opportunities_invalid_json() -> None:
    """Test opportunity data extraction with invalid JSON."""
    # Create a temporary file with invalid JSON
    with tempfile.NamedTemporaryFile(delete=False, mode="w") as tmp:
        tmp.write("{invalid json}")
        tmp_path = tmp.name
    original_path = OpportunityExtractor.DATA_FILE
    OpportunityExtractor.DATA_FILE = Path(tmp_path)
    try:
        with pytest.raises(json.JSONDecodeError):
            OpportunityExtractor.extract_opportunities()
    finally:
        OpportunityExtractor.DATA_FILE = original_path
        Path(tmp_path).unlink()
