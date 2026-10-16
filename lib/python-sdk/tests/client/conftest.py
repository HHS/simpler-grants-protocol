"""Shared client-test fixtures."""

import json
from typing import Any, Callable

import httpx
import pytest


@pytest.fixture
def paged_search() -> Callable[..., list[httpx.Request]]:
    """Serve a search route whose page is chosen by the request BODY.

    ``paged_search(client, pages)`` installs an ``httpx.MockTransport`` on
    ``client`` that answers each POST with ``pages[body.pagination.page - 1]``,
    never by call count or query string, and returns the list the transport
    appends each captured request to. A page past the end is served empty.
    """

    def install(client: Any, pages: list[list[dict]]) -> list[httpx.Request]:
        seen: list[httpx.Request] = []

        def handler(request: httpx.Request) -> httpx.Response:
            seen.append(request)
            pagination = json.loads(request.content)["pagination"]
            page = pagination["page"]
            rows = pages[page - 1] if page <= len(pages) else []
            return httpx.Response(
                200,
                json={
                    "status": 200,
                    "message": "Success",
                    "items": rows,
                    "paginationInfo": {
                        "page": page,
                        "pageSize": pagination["pageSize"],
                        "totalItems": sum(len(p) for p in pages),
                        "totalPages": len(pages),
                    },
                    "sortInfo": {"sortBy": "lastModifiedAt", "sortOrder": "desc"},
                    "filterInfo": {"filters": {}, "errors": []},
                },
            )

        client.http = httpx.Client(transport=httpx.MockTransport(handler))
        return seen

    return install
