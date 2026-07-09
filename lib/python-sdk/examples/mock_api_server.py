#!/usr/bin/env python3
"""Minimal mock CommonGrants API for running the examples without a real server.

Serves the GET and POST routes the SDK client calls. The search route applies the
standard ``status`` filter so the happy path returns a realistic subset. Start it
in one terminal:

    poetry run python examples/mock_api_server.py

Then run an example against http://localhost:8000 in another terminal, and stop
the server with Ctrl-C when you are done.
"""

from __future__ import annotations

import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any

PORT = int(os.environ.get("PORT", "8000"))

# Two opportunities, each carrying a "programCode" custom field so an example can
# show a typed custom field on a parsed row.
MOCK_OPPORTUNITIES: list[dict[str, Any]] = [
    {
        "id": "573525f2-8e15-4405-83fb-e6523511d893",
        "title": "STEM Education Grant Program",
        "description": "A grant program focused on improving STEM education.",
        "status": {"value": "open", "description": "Open"},
        "createdAt": "2025-01-01T00:00:00Z",
        "lastModifiedAt": "2025-01-15T00:00:00Z",
        "customFields": {
            "programCode": {
                "name": "programCode",
                "fieldType": "string",
                "value": "STEM-ED",
            },
        },
    },
    {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "title": "Community Development Grant",
        "description": "Funding for community development projects.",
        "status": {"value": "forecasted", "description": "Forecasted"},
        "createdAt": "2025-01-02T00:00:00Z",
        "lastModifiedAt": "2025-01-16T00:00:00Z",
        "customFields": {
            "programCode": {
                "name": "programCode",
                "fieldType": "string",
                "value": "COMM-DEV",
            },
        },
    },
]


def _requested_statuses(filters: dict[str, Any]) -> list[str] | None:
    """The status values a search asked for, if it included a status filter."""
    status = filters.get("status")
    if isinstance(status, dict) and isinstance(status.get("value"), list):
        return [str(v) for v in status["value"]]
    return None


class Handler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args: Any) -> None:
        """Silence the default per-request logging."""

    def _send(self, status: int, body: dict[str, Any]) -> None:
        payload = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self) -> None:
        path = self.path.split("?")[0]
        if path == "/common-grants/opportunities":
            self._send(
                200,
                {
                    "status": 200,
                    "message": "Success",
                    "items": MOCK_OPPORTUNITIES,
                    "paginationInfo": {
                        "page": 1,
                        "pageSize": 25,
                        "totalItems": len(MOCK_OPPORTUNITIES),
                        "totalPages": 1,
                    },
                },
            )
            return
        if path.startswith("/common-grants/opportunities/"):
            opp_id = path.rsplit("/", 1)[-1]
            opp = next(
                (o for o in MOCK_OPPORTUNITIES if o["id"] == opp_id),
                MOCK_OPPORTUNITIES[0],
            )
            self._send(200, {"status": 200, "message": "Success", "data": opp})
            return
        self._send(404, {"status": 404, "message": "Not found"})

    def do_POST(self) -> None:
        if self.path.split("?")[0] != "/common-grants/opportunities/search":
            self._send(404, {"status": 404, "message": "Not found"})
            return

        length = int(self.headers.get("Content-Length", "0") or "0")
        raw = self.rfile.read(length) if length else b""
        try:
            body = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            body = {}

        filters = body.get("filters") or {}
        items = list(MOCK_OPPORTUNITIES)
        wanted = _requested_statuses(filters) if isinstance(filters, dict) else None
        if wanted is not None:
            items = [o for o in items if o["status"]["value"] in wanted]

        self._send(
            200,
            {
                "status": 200,
                "message": "Success",
                "items": items,
                "paginationInfo": {
                    "page": 1,
                    "pageSize": max(len(items), 1),
                    "totalItems": len(items),
                    "totalPages": 1,
                },
                "sortInfo": {
                    "sortBy": "lastModifiedAt",
                    "sortOrder": "desc",
                    "customSortBy": None,
                    "errors": [],
                },
                "filterInfo": {"filters": {}, "errors": []},
            },
        )


def main() -> None:
    server = HTTPServer(("localhost", PORT), Handler)
    print(f"Mock CommonGrants API listening on http://localhost:{PORT}")
    print("Run an example in another terminal. Ctrl-C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()


if __name__ == "__main__":
    main()
