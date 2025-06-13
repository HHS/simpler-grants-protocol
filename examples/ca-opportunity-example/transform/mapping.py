"""Mapping specification for transforming CA Grants Portal data to CommonGrants Protocol format."""


# Mapping spec for transforming CA Grants Portal data to CommonGrants Protocol format
CA_GRANTS_MAPPING = {
    "id": {"field": "PortalID"},  # Using PortalID as the unique identifier
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
        "agencyDept": {
            "name": "agencyDept",
            "type": "string",
            "value": {"field": "agencyDept"},
            "description": "Agency department",
        },
        "categories": {
            "name": "categories",
            "type": "string",
            "value": {"field": "Categories"},
            "description": "Categories",
        },
        "categorySuggestion": {
            "name": "categorySuggestion",
            "type": "string",
            "value": {"field": "CategorySuggestion"},
            "description": "Category suggestion",
        },
        "purpose": {
            "name": "purpose",
            "type": "string",
            "value": {"field": "Purpose"},
            "description": "purpose",
        },
        "agencyURL": {
            "name": "agencyURL",
            "type": "string",
            "value": {"field": "AgencyURL"},
            "description": "agencyURL",
        },
        "applicantType": {
            "name": "applicantType",
            "type": "string",
            "value": {"field": "ApplicantType"},
            "description": "applicantType",
        },
        "applicantTypeNotes": {
            "name": "applicantTypeNotes",
            "type": "string",
            "value": {"field": "ApplicantTypeNotes"},
            "description": "applicantTypeNotes",
        },
        "geography": {
            "name": "geography",
            "type": "string",
            "value": {"field": "Geography"},
            "description": "geography",
        },
    },
    "lastModifiedAt": {"field": "LastUpdated"},
}
