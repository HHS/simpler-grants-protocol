"""
Test module for the CA Grants transformer.

This module contains tests for transforming grant opportunity data from the
California Grants Portal format to the CommonGrants Protocol format.
"""

from pathlib import Path

from ca_common_grants.utils.opp_map_transform import OpportunityMapTransformer


class TestTransformOpportunities:
    """Test transforming opportunities from sample data."""

    EXPECTED_OPPORTUNITY_COUNT = 3

    def test_transform_opportunities(self) -> None:
        """Test transforming opportunities from sample data."""
        # Get the path to the sample data file
        current_dir = Path(__file__).resolve().parent
        sample_data_path = (
            current_dir.parent
            / "src"
            / "ca_common_grants"
            / "data"
            / "ca_grants_sample.json"
        )

        # Transform the sample data
        opportunities = OpportunityMapTransformer.transform_opportunities_file(
            sample_data_path,
        )

        # Verify we got the expected number of opportunities
        assert len(opportunities) == self.EXPECTED_OPPORTUNITY_COUNT

        # Test the first opportunity (Cultural Districts grant)
        first_opp = opportunities[0]

        # Verify basic fields
        assert first_opp["title"] == "Cultural Districts"
        assert first_opp["status"] == "open"  # 'active' should map to 'open'
        assert "Cultural Districts program" in first_opp["description"]

        # Verify funding information
        assert first_opp["funding"]["totalAmountAvailable"]["amount"] == "$100,000"
        assert first_opp["funding"]["minAwardAmount"]["amount"] == "$10,000"
        assert first_opp["funding"]["maxAwardAmount"]["amount"] == "$10,000"
        assert first_opp["funding"]["totalAmountAvailable"]["currency"] == "USD"

        # Verify key dates
        assert first_opp["keyDates"]["appOpens"] == "2025-06-10 07:00:00"
        assert first_opp["keyDates"]["appDeadline"] == "2025-08-07 11:59:00"
        assert first_opp["keyDates"]["otherDates"]["expAwardDate"]["date"] == "12/31/25"

        # Verify custom fields
        assert first_opp["customFields"]["portalID"]["value"] == "118170"
        assert first_opp["customFields"]["agencyDept"]["value"] == "CA Arts Council"

        # Verify URL
        assert first_opp["source"] == "https://www.caculturaldistricts.org/application"

        # Verify timestamps
        assert first_opp["lastModifiedAt"] == "2025-06-10 21:48:46"

    def test_transform_opportunities_with_empty_data(self) -> None:
        """Test transforming empty data."""
        transformer = OpportunityMapTransformer()
        empty_data = {"grants": []}
        transformed = transformer.transform_opportunities(empty_data)
        assert len(transformed) == 0

    def test_transform_opportunities_with_missing_fields(self) -> None:
        """Test transforming data with missing fields."""
        transformer = OpportunityMapTransformer()
        minimal_data = {
            "grants": [{"PortalID": "123", "Title": "Test Grant", "Status": "active"}],
        }
        transformed = transformer.transform_opportunities(minimal_data)
        assert len(transformed) == 1
        assert transformed[0]["customFields"]["portalID"]["value"] == "123"
        assert transformed[0]["title"] == "Test Grant"
        assert transformed[0]["status"] == "open"
