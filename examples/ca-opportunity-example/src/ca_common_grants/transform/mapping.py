"""Mapping specification for transforming CA Grants Portal data to CommonGrants Protocol format."""

from common_grants_sdk.schemas.fields import CustomFieldType

CA_GRANTS_MAPPING = {
    "title": {"field": "Title"},
    "status": {
        "switch": {
            "field": "Status",
            "case": {"active": "open", "forecasted": "forecasted", "closed": "closed"},
            "default": "custom",
        },
    },
    "description": {"field": "Description"},
    "funding": {
        "totalAmountAvailable": {
            "amount": {"field": "EstAvailFunds"},
            "currency": "USD",
        },
        "minAwardAmount": {"amount": {"field": "EstAmounts"}, "currency": "USD"},
        "maxAwardAmount": {"amount": {"field": "EstAmounts"}, "currency": "USD"},
    },
    "keyDates": {
        "appOpens": {"field": "OpenDate"},
        "appDeadline": {"field": "ApplicationDeadline"},
        "otherDates": {
            "expAwardDate": {
                "name": "expAwardDate",
                "date": {"field": "ExpAwardDate"},
                "description": "Expected award date",
            },
        },
    },
    "source": {"field": "GrantURL"},
    "customFields": {
        "portalID": {
            "name": "portalID",
            "type": CustomFieldType.STRING,
            "value": {"field": "PortalID"},
            "description": "CA Portal ID",
        },
        "agencyDept": {
            "name": "agencyDept",
            "type": CustomFieldType.STRING,
            "value": {"field": "AgencyDept"},
            "description": "Agency department",
        },
        "categories": {
            "name": "categories",
            "type": CustomFieldType.STRING,
            "value": {"field": "Categories"},
            "description": "Categories",
        },
        "categorySuggestion": {
            "name": "categorySuggestion",
            "type": CustomFieldType.STRING,
            "value": {"field": "CategorySuggestion"},
            "description": "Category suggestion",
        },
        "purpose": {
            "name": "purpose",
            "type": CustomFieldType.STRING,
            "value": {"field": "Purpose"},
            "description": "purpose",
        },
        "agencyURL": {
            "name": "agencyURL",
            "type": CustomFieldType.STRING,
            "value": {"field": "AgencyURL"},
            "description": "agencyURL",
        },
        "applicantType": {
            "name": "applicantType",
            "type": CustomFieldType.STRING,
            "value": {"field": "ApplicantType"},
            "description": "applicantType",
        },
        "applicantTypeNotes": {
            "name": "applicantTypeNotes",
            "type": CustomFieldType.STRING,
            "value": {"field": "ApplicantTypeNotes"},
            "description": "applicantTypeNotes",
        },
        "geography": {
            "name": "geography",
            "type": CustomFieldType.STRING,
            "value": {"field": "Geography"},
            "description": "geography",
        },
    },
    "lastModifiedAt": {"field": "LastUpdated"},
    "createdAt": {"field": "LastUpdated"},
}
