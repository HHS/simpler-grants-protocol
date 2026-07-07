/**
 * Minimal mock CommonGrants API server for running examples without the FastAPI template.
 *
 * Serves GET/POST routes that match the SDK client. Start with:
 *   pnpm example:server
 *
 * Then run any example (get, list, search, get-custom-fields) against http://localhost:8000.
 *
 * The search route understands `filters`: it applies the standard `status`
 * filter, and echoes every received filter (including `customFilters`) back in
 * `filterInfo.filters`, so examples can show that registered and ad-hoc custom
 * filters reached the server. Import `createMockServer()` to run it in-process.
 */

import { createServer, type Server } from "http";

const PORT = parseInt(process.env.PORT ?? "8000", 10);

// =============================================================================
// Mock Opportunities
// =============================================================================

const MOCK_OPPORTUNITIES = [
  {
    id: "573525f2-8e15-4405-83fb-e6523511d893",
    title: "STEM Education Grant Program",
    description: "A grant program focused on improving STEM education.",
    status: { value: "open" },
    createdAt: "2025-01-01T00:00:00Z",
    lastModifiedAt: "2025-01-15T00:00:00Z",
    customFields: {
      legacyId: {
        name: "legacyId",
        fieldType: "integer",
        value: 12345,
        description: "Legacy system opportunity ID",
      },
      programCode: {
        name: "programCode",
        fieldType: "string",
        value: "STEM-ED",
        description: "Funding program code",
      },
    },
  },
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    title: "Community Development Grant",
    description: "Funding for community development projects.",
    status: { value: "open" },
    createdAt: "2025-01-02T00:00:00Z",
    lastModifiedAt: "2025-01-16T00:00:00Z",
    customFields: {
      legacyId: {
        name: "legacyId",
        fieldType: "integer",
        value: 12346,
        description: "Legacy system opportunity ID",
      },
      programCode: {
        name: "programCode",
        fieldType: "string",
        value: "COMM-DEV",
        description: "Funding program code",
      },
    },
  },
  {
    id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    title: "Education Initiative",
    description: "Support for education initiatives.",
    status: { value: "forecasted" },
    createdAt: "2025-01-03T00:00:00Z",
    lastModifiedAt: "2025-01-17T00:00:00Z",
    customFields: {
      legacyId: {
        name: "legacyId",
        fieldType: "integer",
        value: 12347,
        description: "Legacy system opportunity ID",
      },
      programCode: {
        name: "programCode",
        fieldType: "string",
        value: "EDU-INIT",
        description: "Funding program code",
      },
    },
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

function send(res: import("http").ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function parseQuery(url: string): Record<string, string> {
  const i = url.indexOf("?");
  if (i === -1) return {};
  const out: Record<string, string> = {};
  for (const part of url.slice(i + 1).split("&")) {
    const [k, v] = part.split("=").map(decodeURIComponent);
    if (k && v !== undefined) out[k] = v;
  }
  return out;
}

/** Status values carried by an opportunity, for the standard `status` filter. */
function statusOf(opp: (typeof MOCK_OPPORTUNITIES)[number]): string {
  return opp.status.value;
}

// =============================================================================
// Mock API Server
// =============================================================================

/** Builds the mock server without starting it, so examples can run it in-process. */
export function createMockServer(): Server {
  return createServer((req, res) => {
    const url = req.url ?? "";
    const method = req.method ?? "GET";
    const path = url.split("?")[0];

    // =========================================================================
    // GET /common-grants/opportunities
    // =========================================================================

    if (method === "GET" && path === "/common-grants/opportunities") {
      const q = parseQuery(url);
      const page = Math.max(1, parseInt(q.page ?? "1", 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(q.pageSize ?? "25", 10)));
      const start = (page - 1) * pageSize;
      const items = MOCK_OPPORTUNITIES.slice(start, start + pageSize);
      send(res, 200, {
        status: 200,
        message: "Success",
        items,
        paginationInfo: {
          page,
          pageSize,
          totalItems: MOCK_OPPORTUNITIES.length,
          totalPages: Math.ceil(MOCK_OPPORTUNITIES.length / pageSize),
        },
      });
      return;
    }

    // =========================================================================
    // GET /common-grants/opportunities/:id
    // =========================================================================

    if (method === "GET" && path.startsWith("/common-grants/opportunities/")) {
      const id = path.slice("/common-grants/opportunities/".length);
      const opp = MOCK_OPPORTUNITIES.find(o => o.id === id) ?? {
        id,
        title: "Mock Opportunity",
        description: "Mock opportunity for examples.",
        status: { value: "open" },
        createdAt: "2025-01-01T00:00:00Z",
        lastModifiedAt: "2025-01-01T00:00:00Z",
      };
      send(res, 200, {
        status: 200,
        message: "Success",
        data: opp,
      });
      return;
    }

    // =========================================================================
    // POST /common-grants/opportunities/search
    // =========================================================================

    if (method === "POST" && path === "/common-grants/opportunities/search") {
      let body = "";
      req.on("data", chunk => {
        body += chunk;
      });
      req.on("end", () => {
        let items = [...MOCK_OPPORTUNITIES];
        let filters: Record<string, unknown> = {};
        try {
          const parsed = body
            ? (JSON.parse(body) as { search?: string; filters?: Record<string, unknown> })
            : {};
          if (parsed.search && typeof parsed.search === "string") {
            const q = parsed.search.toLowerCase();
            items = items.filter(o => o.title.toLowerCase().includes(q));
          }
          filters = parsed.filters ?? {};
          // Apply the standard `status` filter; custom filters are echoed but
          // not applied by this mock.
          const status = filters.status as { value?: unknown } | undefined;
          if (Array.isArray(status?.value)) {
            const allowed = new Set(status.value as string[]);
            items = items.filter(o => allowed.has(statusOf(o)));
          }
        } catch {
          // ignore malformed bodies
        }
        send(res, 200, {
          status: 200,
          message: "Success",
          items,
          paginationInfo: {
            page: 1,
            pageSize: items.length > 0 ? items.length : 1,
            totalItems: items.length,
            totalPages: 1,
          },
          sortInfo: { sortBy: "lastModifiedAt", sortOrder: "desc" },
          // Echo the received filters so a consumer can confirm registered and
          // ad-hoc custom filters reached the server.
          filterInfo: { filters },
        });
      });
      return;
    }

    send(res, 404, { status: 404, message: "Not found" });
  });
}

// =============================================================================
// Start Server (only when run directly, e.g. `pnpm example:server`)
// =============================================================================
if (process.argv[1]?.includes("mock-api-server")) {
  createMockServer().listen(PORT, () => {
    console.log(`Mock CommonGrants API listening on http://localhost:${PORT}`);
    console.log("");
    console.log("Run examples in another terminal:");
    console.log("  pnpm example:list");
    console.log("  pnpm example:get 573525f2-8e15-4405-83fb-e6523511d893");
    console.log("  pnpm example:search education");
    console.log("  pnpm example:get-custom-fields 573525f2-8e15-4405-83fb-e6523511d893");
    console.log("");
  });
}
