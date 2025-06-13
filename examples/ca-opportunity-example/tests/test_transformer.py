import os

from transform.transformer import CATransformer


def test_transform_opportunities():
    """Test transforming opportunities from sample data."""
    # Get the path to the sample data file
    current_dir = os.path.dirname(os.path.abspath(__file__))
    sample_data_path = os.path.join(
        os.path.dirname(current_dir), "data", "ca_grants_sample.json",
    )

    # Transform the sample data
    transformed_opportunities = CATransformer.from_file(sample_data_path)

    # Verify we got the expected number of opportunities
    assert len(transformed_opportunities) == 3, "Expected 3 transformed opportunities"

    # Test the first opportunity (Cultural Districts grant)
    first_opp = transformed_opportunities[0]

    # Verify basic fields
    assert first_opp["id"] == "118170"
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
    assert first_opp["keyDates"]["awardDate"] == "12/31/25"

    # Verify agency information
    assert first_opp["agency"]["name"] == "CA Arts Council"
    assert first_opp["agency"]["url"] == "https://arts.ca.gov/"

    # Verify eligibility
    expected_applicant_types = [
        "Nonprofit",
        "Other Legal Entity",
        "Public Agency",
        "Tribal Government",
    ]
    assert first_opp["eligibility"]["applicantTypes"] == expected_applicant_types

    # Verify contact information
    assert first_opp["contact"]["name"] == "Gabrielle Rosado"
    assert first_opp["contact"]["email"] == "culturaldistrictsgrant@arts.ca.gov"
    assert first_opp["contact"]["phone"] == "1-916-322-6555"

    # Verify URL
    assert first_opp["url"] == "https://www.caculturaldistricts.org/application"

    # Verify timestamps
    assert first_opp["created_at"] == "2025-06-10 21:48:46"
    assert first_opp["last_modified_at"] == "2025-06-10 21:48:46"


def test_transform_opportunities_with_empty_data():
    """Test transforming empty data."""
    transformer = CATransformer()
    empty_data = {"grants": []}
    transformed = transformer.transform_opportunities(empty_data)
    assert len(transformed) == 0, "Expected empty list for empty data"


def test_transform_opportunities_with_missing_fields():
    """Test transforming data with missing fields."""
    transformer = CATransformer()
    minimal_data = {
        "grants": [{"PortalID": "123", "Title": "Test Grant", "Status": "active"}],
    }
    transformed = transformer.transform_opportunities(minimal_data)
    assert len(transformed) == 1, "Expected one transformed opportunity"
    assert transformed[0]["id"] == "123"
    assert transformed[0]["title"] == "Test Grant"
    assert transformed[0]["status"] == "open"
