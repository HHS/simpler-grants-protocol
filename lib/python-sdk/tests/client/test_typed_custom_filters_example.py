"""Happy-path test for the typed_custom_filters example.

Exercises the example's plugin from the consumer side: ``get_client()`` parses the
plugin's custom fields with no per-call ``schema=``, and a malformed row is
partitioned into ``result.errors`` rather than raising.
"""

import json
from datetime import UTC, datetime
from unittest.mock import Mock

import httpx

from common_grants_sdk.client import Config, ParseFailure, SearchResult
from common_grants_sdk.extensions import f
from examples.typed_custom_filters import opportunity_plugin


def _opportunity_row():
    return {
        "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "title": "AI research grant",
        "description": "Funding for applied AI research.",
        "status": {"value": "open", "description": "Open"},
        "createdAt": datetime.now(UTC).isoformat(),
        "lastModifiedAt": datetime.now(UTC).isoformat(),
        "customFields": {
            "programCode": {
                "name": "programCode",
                "fieldType": "string",
                "value": "EDU-1",
            },
            "legacyId": {"name": "legacyId", "fieldType": "integer", "value": 42},
        },
    }


def _search_response(items):
    return {
        "status": 200,
        "message": "Success",
        "items": items,
        "paginationInfo": {
            "page": 1,
            "pageSize": 100,
            "totalItems": 2,
            "totalPages": 1,
        },
        "sortInfo": {"sortBy": "lastModifiedAt", "sortOrder": "desc", "errors": []},
        "filterInfo": {"filters": {}, "errors": []},
    }


def _client_with_response(payload):
    client = opportunity_plugin.get_client(
        Config(base_url="https://api.example.com", api_key="test-key")
    )
    mock_http = Mock(spec=httpx.Client)
    mock_response = Mock()
    mock_response.status_code = 200
    mock_response.text = json.dumps(payload)
    mock_response.json = Mock(return_value=payload)
    mock_response.raise_for_status = Mock()
    mock_http.post = Mock(return_value=mock_response)
    client.http = mock_http
    return client


def test_get_client_parses_custom_fields_without_per_call_schema():
    """The plugin-bound client parses custom fields with no ``schema=`` argument."""
    client = _client_with_response(_search_response([_opportunity_row()]))

    result = client.opportunities.search(
        search="ai", filters={"region": f.in_(["US-CA", "US-NY"])}, page=1
    )

    assert isinstance(result, SearchResult)
    assert len(result.items) == 1
    opp = result.items[0]
    assert opp.custom_fields is not None
    assert opp.custom_fields.program_code is not None
    assert opp.custom_fields.program_code.value == "EDU-1"
    assert opp.custom_fields.legacy_id is not None
    assert opp.custom_fields.legacy_id.value == 42
    assert result.errors == []


def test_search_partitions_a_malformed_row():
    """A malformed row lands in result.errors; valid rows still return."""
    client = _client_with_response(
        _search_response([_opportunity_row(), {"id": "not-a-uuid"}])
    )

    result = client.opportunities.search(search="ai", page=1)

    assert len(result.items) == 1
    assert len(result.errors) == 1
    assert isinstance(result.errors[0], ParseFailure)
    assert result.errors[0].index == 1
