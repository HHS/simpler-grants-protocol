"""Example demonstrating how to use the cg-custom-fields-plugin to validate
and access all typed custom fields on an Opportunity.

Install the published plugin before running:

    pip install cg-custom-fields-plugin

Then run this script from the lib/python-sdk directory:

    poetry run python examples/extensions.py
"""

import json

from  cg_grants_gov  import grants_gov


# ---------------------------------------------------------------------------
# Sample API payload containing all ten custom fields
# ---------------------------------------------------------------------------

api_response = {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "Rural Broadband Infrastructure Grant",
    "status": {"value": "open"},
    "description": "Funding to expand broadband access in rural and underserved communities",
    "createdAt": "2025-01-15T00:00:00Z",
    "lastModifiedAt": "2025-03-20T00:00:00Z",
    "customFields": {
        "legacySerialId": {
            "fieldType": "integer",
            "value": 334455,
        },
        "federalOpportunityNumber": {
            "fieldType": "string",
            "value": "USDA-RD-2025-0042",
        },
        "assistanceListings": {
            "fieldType": "array",
            "value": [
                json.dumps({"identifier": "10.759", "programTitle": "Distance Learning and Telemedicine"}),
                json.dumps({"identifier": "10.886", "programTitle": "Rural Broadband Access Loans and Loan Guarantees"}),
            ],
        },
        "agency": {
            "fieldType": "object",
            "value": {
                "code": "USDA-RD",
                "name": "Rural Development",
                "parentName": "U.S. Department of Agriculture",
                "parentCode": "USDA",
            },
        },
        "attachments": {
            "fieldType": "array",
            "value": [
                json.dumps({
                    "name": "NOFO-USDA-RD-2025-0042.pdf",
                    "description": "Notice of Funding Opportunity",
                    "downloadUrl": "https://grants.gov/documents/NOFO-USDA-RD-2025-0042.pdf",
                    "sizeInBytes": 204800,
                    "mimeType": "application/pdf",
                    "createdAt": "2025-01-15T00:00:00Z",
                    "lastModifiedAt": "2025-01-15T00:00:00Z",
                }),
            ],
        },
        "federalFundingSource": {
            "fieldType": "string",
            "value": "Cooperative Agreements",
        },
        "contactInfo": {
            "fieldType": "object",
            "value": {
                "name": "Jane Smith",
                "email": "jane.smith@usda.gov",
                "phone": "202-555-0100",
                "description": "Program Director, Rural Broadband Division",
            },
        },
        "additionalInfo": {
            "fieldType": "object",
            "value": {
                "url": "https://www.rd.usda.gov/programs-services/telecommunications-programs",
                "description": "Full program details and eligibility requirements",
            },
        },
        "fiscalYear": {
            "fieldType": "integer",
            "value": 2025,
        },
        "costSharing": {
            "fieldType": "object",
            "value": {
                "isRequired": True,
            },
        },
    },
}

# ---------------------------------------------------------------------------
# Validate with the typed Opportunity model from the plugin
# ---------------------------------------------------------------------------

opp = grants_gov.schemas.Opportunity.model_validate(api_response)

assert opp.custom_fields is not None
assert opp.custom_fields.legacy_serial_id is not None
assert opp.custom_fields.federal_opportunity_number is not None
assert opp.custom_fields.assistance_listings is not None
assert opp.custom_fields.agency is not None
assert opp.custom_fields.attachments is not None
assert opp.custom_fields.federal_funding_source is not None
assert opp.custom_fields.contact_info is not None
assert opp.custom_fields.additional_info is not None
assert opp.custom_fields.fiscal_year is not None
assert opp.custom_fields.cost_sharing is not None

cf = opp.custom_fields

print(f"Title:                      {opp.title}")
print(f"Status:                     {opp.status.value}")
print(f"legacySerialId:             {cf.legacy_serial_id.value}")
print(f"federalOpportunityNumber:   {cf.federal_opportunity_number.value}")
print(f"assistanceListings:         {cf.assistance_listings.value}")
print(f"agency:                     {cf.agency.value}")
print(f"attachments:                {cf.attachments.value}")
print(f"federalFundingSource:       {cf.federal_funding_source.value}")
print(f"contactInfo:                {cf.contact_info.value}")
print(f"additionalInfo:             {cf.additional_info.value}")
print(f"fiscalYear:                 {cf.fiscal_year.value}")
print(f"costSharing:                {cf.cost_sharing.value}")
print()

# ---------------------------------------------------------------------------
# Inspect the registered extension specs
# ---------------------------------------------------------------------------

print("Registered extensions:")
for field_name, spec in grants_gov.extensions["Opportunity"].items():
    print(f"  {field_name}: {spec.field_type} — {spec.description}")
