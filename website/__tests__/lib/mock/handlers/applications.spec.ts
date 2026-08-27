/**
 * Handler + fixture suite for the application and form-response endpoints
 * (#334): `POST /applications/start`, `GET /applications/{appId}`,
 * `PUT /applications/{appId}/submit`, `POST /applications/search`, and
 * `GET|PUT /applications/{appId}/forms/{formId}`. Modeled on `awards.spec.ts`.
 *
 * Applications are `@added(Versions.v0_2)` (`lib/core/lib/core/models/application.tsp`),
 * so every call here targets version "0.4.0" directly against the handler
 * functions rather than through `handleMockRequest` — the router doesn't yet
 * know the `/applications` path exists, and wiring it is a separate ticket's
 * router spec, not this one. Two tests deliberately target an earlier version:
 * the `title`/`name` rename (added v0.4) and `searchApplications`'s v0.3 floor.
 */
import { describe, it, expect } from "vitest";
import {
  APPLICATION_FIXTURES,
  CANONICAL_APPLICATION_ID,
  BLOCKED_APPLICATION_ID,
  DRAFT_APPLICATION_ID,
  getApplicationById,
  canonicalPrefillResolves,
} from "@/lib/mock/data/applications";
import {
  COMPETITION_FIXTURES,
  CANONICAL_COMPETITION_ID,
} from "@/lib/mock/data/competitions";
import { CANONICAL_FORM_ID } from "@/lib/mock/data/forms";
import { RESERVED_MISSING_ID } from "@/lib/mock/data/ids";
import type { Version } from "@/lib/mock/data/fixtures";
import {
  startApplication,
  getApplication,
  submitApplication,
  searchApplications,
  writeFormResponse,
  readFormResponse,
} from "@/lib/mock/handlers/applications";

const VERSION: Version = "0.4.0";

/** Builds `https://docs.example/api/v{version}/common-grants/applications{suffix}`. */
function applicationsUrl(version: string, suffix = ""): string {
  return `https://docs.example/api/v${version}/common-grants/applications${suffix}`;
}

/** POSTs a JSON body to `/applications/start` and returns the raw `Response`. */
function runStart(version: Version, body: unknown): Promise<Response> {
  return startApplication(
    new Request(applicationsUrl(version, "/start"), {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }),
    version,
  );
}

/** POSTs a JSON body to `/applications/search` and returns the parsed 200 body. */
async function runSearchBody(version: Version, body: unknown) {
  const response = await searchApplications(
    new Request(applicationsUrl(version, "/search"), {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }),
    version,
  );

  expect(response.status).toBe(200);

  return (await response.json()) as {
    status: number;
    message: string;
    items: Array<
      Record<string, unknown> & {
        id: string;
        status: { value: string };
        competitionId: string;
      }
    >;
    paginationInfo: unknown;
    sortInfo: unknown;
    filterInfo: unknown;
  };
}

describe("POST /v{version}/common-grants/applications/start", () => {
  it("returns 201 with the created application echoing the submitted competitionId, title, and the competition's own opportunityId", async () => {
    const competition = COMPETITION_FIXTURES.find(
      (c) => c.id === CANONICAL_COMPETITION_ID,
    )!;

    const response = await runStart(VERSION, {
      competitionId: CANONICAL_COMPETITION_ID,
      title: "My new application",
    });

    expect(response.status).toBe(201);

    const body = (await response.json()) as {
      status: number;
      data: {
        id: string;
        title: string;
        competitionId: string;
        opportunityId: string;
      };
    };

    expect(body.status).toBe(201);
    expect(body.data.id).toBe(DRAFT_APPLICATION_ID);
    expect(body.data.title).toBe("My new application");
    expect(body.data.competitionId).toBe(CANONICAL_COMPETITION_ID);
    expect(body.data.opportunityId).toBe(competition.opportunityId);
  });

  it("returns identical bodies across two identical start calls", async () => {
    const payload = {
      competitionId: CANONICAL_COMPETITION_ID,
      title: "My new application",
    };

    const responseA = await runStart(VERSION, payload);
    const responseB = await runStart(VERSION, payload);

    const [bodyA, bodyB] = await Promise.all([
      responseA.text(),
      responseB.text(),
    ]);
    expect(bodyA).toBe(bodyB);
  });

  it("returns 400 with a title field error when title is missing", async () => {
    const response = await runStart(VERSION, {
      competitionId: CANONICAL_COMPETITION_ID,
    });

    expect(response.status).toBe(400);

    const body = (await response.json()) as {
      errors: Array<{ field: string; message: string }>;
    };
    expect(body.errors.some((error) => error.field === "title")).toBe(true);
  });

  it("returns 400 with a competitionId field error when competitionId is missing", async () => {
    const response = await runStart(VERSION, { title: "My new application" });

    expect(response.status).toBe(400);

    const body = (await response.json()) as {
      errors: Array<{ field: string; message: string }>;
    };
    expect(body.errors.some((error) => error.field === "competitionId")).toBe(
      true,
    );
  });

  it("returns 404 with a competitionId field error for a well-formed but unknown competitionId", async () => {
    const response = await runStart(VERSION, {
      competitionId: RESERVED_MISSING_ID,
      title: "My new application",
    });

    expect(response.status).toBe(404);

    const body = (await response.json()) as {
      errors: Array<{ field: string; message: string }>;
    };
    expect(body.errors.some((error) => error.field === "competitionId")).toBe(
      true,
    );
  });

  it("returns 400 with a competitionId field error for a non-UUID competitionId", async () => {
    const response = await runStart(VERSION, {
      competitionId: "not-a-uuid",
      title: "My new application",
    });

    expect(response.status).toBe(400);

    const body = (await response.json()) as {
      errors: Array<{ field: string; message: string }>;
    };
    expect(body.errors.some((error) => error.field === "competitionId")).toBe(
      true,
    );
  });

  // `title` is `@Versioning.renamedFrom(Versions.v0_4, "name")`
  // (`lib/core/lib/core/routes/applications.tsp`), so a pre-v0.4 request sends
  // `name` instead, and a v0.4 request that still sends `name` is missing the
  // now-required `title` field.
  it("accepts the pre-v0.4 name field in place of title, and rejects a v0.4 request that still uses name", async () => {
    const preV04Response = await runStart("0.3.0", {
      competitionId: CANONICAL_COMPETITION_ID,
      name: "My legacy-named application",
    });

    expect(preV04Response.status).toBe(201);

    const preV04Body = (await preV04Response.json()) as {
      data: { title: string };
    };
    expect(preV04Body.data.title).toBe("My legacy-named application");

    const v04Response = await runStart(VERSION, {
      competitionId: CANONICAL_COMPETITION_ID,
      name: "My legacy-named application",
    });

    expect(v04Response.status).toBe(400);

    const v04Body = (await v04Response.json()) as {
      errors: Array<{ field: string; message: string }>;
    };
    expect(v04Body.errors.some((error) => error.field === "title")).toBe(true);
  });

  it("returns 400 'Malformed JSON body' for a malformed JSON body", async () => {
    const response = await startApplication(
      new Request(applicationsUrl(VERSION, "/start"), {
        method: "POST",
        body: "{not valid json",
        headers: { "Content-Type": "application/json" },
      }),
      VERSION,
    );

    expect(response.status).toBe(400);

    const body = (await response.json()) as { status: number; message: string };
    expect(body.status).toBe(400);
    expect(body.message).toBe("Malformed JSON body");
  });
});

describe("GET /v{version}/common-grants/applications/{appId} (detail)", () => {
  // Swagger UI pre-fills every path parameter box with the specs' single
  // `Types.uuid` example (see `data/ids.ts`), so this is the id an untouched
  // "Try it out" sends for this route. It must not 404.
  it("returns 200 for the id Swagger UI pre-fills into every path parameter box", async () => {
    const response = getApplication(CANONICAL_APPLICATION_ID, VERSION);

    expect(response.status).toBe(200);

    const body = (await response.json()) as { data: { id: string } };
    expect(body.data.id).toBe(CANONICAL_APPLICATION_ID);
  });

  it("returns 400 with an appId field error for a non-UUID appId", async () => {
    const response = getApplication("not-a-uuid", VERSION);

    expect(response.status).toBe(400);

    const body = (await response.json()) as {
      errors: Array<{ field: string; message: string }>;
    };
    expect(body.errors).toEqual([
      { field: "appId", message: "Must be a valid UUID" },
    ]);
  });

  it("returns 404 with an appId field error for a well-formed but unknown appId", async () => {
    const response = getApplication(RESERVED_MISSING_ID, VERSION);

    expect(response.status).toBe(404);

    const body = (await response.json()) as {
      errors: Array<{ field: string; message: string }>;
    };
    expect(body.errors.some((error) => error.field === "appId")).toBe(true);
  });

  // The mock is stateless: `start` echoes a single reserved draft id without
  // adding it to the fixture set (see `DRAFT_APPLICATION_ID`'s docstring), so a
  // subsequent read of that id must 404 rather than pretend the draft persisted.
  it("returns 404 for DRAFT_APPLICATION_ID, since start echoes without actually creating a record", async () => {
    const response = getApplication(DRAFT_APPLICATION_ID, VERSION);

    expect(response.status).toBe(404);
  });
});

describe("PUT /v{version}/common-grants/applications/{appId}/submit", () => {
  it("returns 200 for an application with no validation errors", async () => {
    const response = await submitApplication(CANONICAL_APPLICATION_ID, VERSION);

    expect(response.status).toBe(200);
  });

  // `ApplicationSubmissionError` is the spec's 400 branch for a submit that
  // can't proceed because the application has outstanding validation errors
  // (`lib/core/lib/core/responses/error.tsp`). BLOCKED_APPLICATION_ID is the
  // fixture built to exercise it.
  it("returns 400 with errors derived from the application's validationErrors for a blocked application", async () => {
    const blockedApplication = getApplicationById(BLOCKED_APPLICATION_ID);
    expect(blockedApplication?.validationErrors?.length).toBeGreaterThan(0);
    const fixtureMessages = blockedApplication!.validationErrors!.map(
      (error) => error.message,
    );

    const response = await submitApplication(BLOCKED_APPLICATION_ID, VERSION);

    expect(response.status).toBe(400);

    const body = (await response.json()) as {
      status: number;
      errors: Array<{ field: string; message: string }>;
    };
    expect(body.status).toBe(400);
    expect(Array.isArray(body.errors)).toBe(true);
    expect(body.errors.length).toBeGreaterThan(0);
    expect(
      body.errors.some((error) => fixtureMessages.includes(error.message)),
    ).toBe(true);
  });

  it("returns 404 for an unknown appId", async () => {
    const response = await submitApplication(RESERVED_MISSING_ID, VERSION);

    expect(response.status).toBe(404);
  });

  it("returns 400 with an appId field error for a non-UUID appId", async () => {
    const response = await submitApplication("not-a-uuid", VERSION);

    expect(response.status).toBe(400);

    const body = (await response.json()) as {
      errors: Array<{ field: string; message: string }>;
    };
    expect(body.errors.some((error) => error.field === "appId")).toBe(true);
  });
});

describe("POST /v{version}/common-grants/applications/search", () => {
  it("returns 200 with items, paginationInfo, sortInfo, and filterInfo for an empty body", async () => {
    const body = await runSearchBody(VERSION, {});

    expect(Array.isArray(body.items)).toBe(true);
    expect(body.paginationInfo).toBeDefined();
    expect(body.sortInfo).toBeDefined();
    expect(body.filterInfo).toBeDefined();
  });

  it("filters to a proper subset matching status = submitted, relative to the unfiltered result set", async () => {
    const unfiltered = await runSearchBody(VERSION, {});
    expect(unfiltered.items.length).toBe(APPLICATION_FIXTURES.length);

    const filtered = await runSearchBody(VERSION, {
      filters: { status: { operator: "in", value: ["submitted"] } },
    });

    expect(filtered.items.length).toBeGreaterThan(0);
    expect(filtered.items.length).toBeLessThan(APPLICATION_FIXTURES.length);
    for (const item of filtered.items) {
      expect(item.status.value).toBe("submitted");
    }
  });

  // The id is drawn from the fixture set itself — a competitionId shared by
  // more than one application — rather than hardcoded, so the test doesn't
  // assume a specific fixture layout beyond "at least one is shared".
  it("narrows results when filtering on a competitionId shared by more than one fixture", async () => {
    const counts = new Map<string, number>();
    for (const application of APPLICATION_FIXTURES) {
      counts.set(
        application.competitionId,
        (counts.get(application.competitionId) ?? 0) + 1,
      );
    }
    const sharedCompetitionId = [...counts.entries()].find(
      ([, count]) => count > 1,
    )?.[0];
    expect(sharedCompetitionId).toBeDefined();

    const expectedCount = APPLICATION_FIXTURES.filter(
      (application) => application.competitionId === sharedCompetitionId,
    ).length;

    const body = await runSearchBody(VERSION, {
      filters: {
        competitionId: { operator: "in", value: [sharedCompetitionId] },
      },
    });

    expect(body.items.length).toBe(expectedCount);
    expect(body.items.length).toBeGreaterThan(1);
    expect(body.items.length).toBeLessThan(APPLICATION_FIXTURES.length);
    for (const item of body.items) {
      expect(item.competitionId).toBe(sharedCompetitionId);
    }
  });

  // Valid `AppSortBy` wire values (`lib/core/lib/core/models/application.tsp`):
  // lastModifiedAt, createdAt, submittedAt, status.value, opportunityId,
  // competitionId, custom. Anything else must be rejected rather than silently
  // ignored.
  it("returns 400 with a sorting.sortBy field error for an unknown sortBy value", async () => {
    const response = await searchApplications(
      new Request(applicationsUrl(VERSION, "/search"), {
        method: "POST",
        body: JSON.stringify({
          sorting: { sortBy: "not_a_real_sort_field" },
        }),
        headers: { "Content-Type": "application/json" },
      }),
      VERSION,
    );

    expect(response.status).toBe(400);

    const body = (await response.json()) as {
      errors: Array<{ field: string; message: string }>;
    };
    expect(body.errors.some((error) => error.field === "sorting.sortBy")).toBe(
      true,
    );
  });

  // Unlike every other search route, `searchApplications` declares `filters`
  // and `sorting` as `@query` parameters, not body fields
  // (`lib/core/lib/core/routes/applications.tsp`). A caller who follows the
  // spec sends them on the query string; this asserts that request narrows the
  // results exactly as the body form does.
  it("filters identically whether filters arrive via the query string (the spec's declared location for this route) or the request body", async () => {
    const filters = { status: { operator: "in", value: ["submitted"] } };

    const viaQueryResponse = await searchApplications(
      new Request(
        applicationsUrl(
          VERSION,
          `/search?filters=${encodeURIComponent(JSON.stringify(filters))}`,
        ),
        { method: "POST" },
      ),
      VERSION,
    );
    expect(viaQueryResponse.status).toBe(200);
    const viaQueryBody = (await viaQueryResponse.json()) as {
      items: Array<{ id: string }>;
    };

    const viaBodyBody = await runSearchBody(VERSION, { filters });

    expect(viaQueryBody.items.map((item) => item.id).sort()).toEqual(
      viaBodyBody.items.map((item) => item.id).sort(),
    );
  });

  // `searchApplications` is `@added(Versions.v0_3)` while its sibling
  // operations (`start`, `get`, `submit`) are `@added(Versions.v0_2)`
  // (`lib/core/lib/core/routes/applications.tsp`), so a v0.2 request must 404
  // rather than fall through to an unversioned implementation.
  it("returns 404 with the protocol Error shape at v0.2, since searchApplications is v0.3+ while its siblings are v0.2+", async () => {
    const response = await searchApplications(
      new Request(applicationsUrl("0.2.0", "/search"), {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      }),
      "0.2.0",
    );

    expect(response.status).toBe(404);

    const body = (await response.json()) as {
      status: number;
      message: string;
      errors: unknown[];
    };
    expect(body.status).toBe(404);
    expect(typeof body.message).toBe("string");
    expect(Array.isArray(body.errors)).toBe(true);
  });
});

describe("GET /v{version}/common-grants/applications/{appId}/forms/{formId} (read)", () => {
  // Both the `appId` and `formId` boxes pre-fill with the same
  // `CommonGrants.Types.uuid` example (see `data/ids.ts`), so an untouched
  // "Try it out" sends this exact pair. `canonicalPrefillResolves()` is the
  // fixture-authoring invariant that keeps it resolvable.
  it("resolves the doubly pre-filled (appId, formId) pair Swagger UI arrives with", async () => {
    expect(canonicalPrefillResolves()).toBe(true);

    const response = readFormResponse(
      CANONICAL_APPLICATION_ID,
      CANONICAL_FORM_ID,
      VERSION,
    );

    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      data: { formId: string; applicationId: string };
    };
    expect(body.data.formId).toBe(CANONICAL_FORM_ID);
    expect(body.data.applicationId).toBe(CANONICAL_APPLICATION_ID);
  });

  it("returns 404 with a formId field error for a well-formed form id the application has no response for", async () => {
    const response = readFormResponse(
      CANONICAL_APPLICATION_ID,
      RESERVED_MISSING_ID,
      VERSION,
    );

    expect(response.status).toBe(404);

    const body = (await response.json()) as {
      errors: Array<{ field: string; message: string }>;
    };
    expect(body.errors.some((error) => error.field === "formId")).toBe(true);
  });

  it("returns 404 with an appId field error for an unknown appId", async () => {
    const response = readFormResponse(
      RESERVED_MISSING_ID,
      CANONICAL_FORM_ID,
      VERSION,
    );

    expect(response.status).toBe(404);

    const body = (await response.json()) as {
      errors: Array<{ field: string; message: string }>;
    };
    expect(body.errors.some((error) => error.field === "appId")).toBe(true);
  });

  it("returns 400 with a formId field error for a non-UUID formId", async () => {
    const response = readFormResponse(
      CANONICAL_APPLICATION_ID,
      "not-a-uuid",
      VERSION,
    );

    expect(response.status).toBe(400);

    const body = (await response.json()) as {
      errors: Array<{ field: string; message: string }>;
    };
    expect(body.errors.some((error) => error.field === "formId")).toBe(true);
  });
});

describe("PUT /v{version}/common-grants/applications/{appId}/forms/{formId} (write)", () => {
  it("echoes the submitted response body under data.response, with formId/applicationId set from the path", async () => {
    const responseBody = {
      name: { first: "Taylor", last: "Reyes" },
      email: "taylor.reyes@example.org",
    };

    const response = await writeFormResponse(
      CANONICAL_APPLICATION_ID,
      CANONICAL_FORM_ID,
      new Request(
        applicationsUrl(
          VERSION,
          `/${CANONICAL_APPLICATION_ID}/forms/${CANONICAL_FORM_ID}`,
        ),
        {
          method: "PUT",
          body: JSON.stringify(responseBody),
          headers: { "Content-Type": "application/json" },
        },
      ),
      VERSION,
    );

    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      data: {
        response: Record<string, unknown>;
        formId: string;
        applicationId: string;
      };
    };
    expect(body.data.response).toEqual(responseBody);
    expect(body.data.formId).toBe(CANONICAL_FORM_ID);
    expect(body.data.applicationId).toBe(CANONICAL_APPLICATION_ID);
  });

  it("returns identical bodies across two identical writeFormResponse calls", async () => {
    const responseBody = {
      name: { first: "Taylor", last: "Reyes" },
      email: "taylor.reyes@example.org",
    };
    const buildRequest = () =>
      new Request(
        applicationsUrl(
          VERSION,
          `/${CANONICAL_APPLICATION_ID}/forms/${CANONICAL_FORM_ID}`,
        ),
        {
          method: "PUT",
          body: JSON.stringify(responseBody),
          headers: { "Content-Type": "application/json" },
        },
      );

    const responseA = await writeFormResponse(
      CANONICAL_APPLICATION_ID,
      CANONICAL_FORM_ID,
      buildRequest(),
      VERSION,
    );
    const responseB = await writeFormResponse(
      CANONICAL_APPLICATION_ID,
      CANONICAL_FORM_ID,
      buildRequest(),
      VERSION,
    );

    const [bodyA, bodyB] = await Promise.all([
      responseA.text(),
      responseB.text(),
    ]);
    expect(bodyA).toBe(bodyB);
  });

  it("returns 400 'Malformed JSON body' for a non-object body", async () => {
    const response = await writeFormResponse(
      CANONICAL_APPLICATION_ID,
      CANONICAL_FORM_ID,
      new Request(
        applicationsUrl(
          VERSION,
          `/${CANONICAL_APPLICATION_ID}/forms/${CANONICAL_FORM_ID}`,
        ),
        {
          method: "PUT",
          body: "[]",
          headers: { "Content-Type": "application/json" },
        },
      ),
      VERSION,
    );

    expect(response.status).toBe(400);

    const body = (await response.json()) as { status: number; message: string };
    expect(body.status).toBe(400);
    expect(body.message).toBe("Malformed JSON body");
  });

  it("returns 404 for an unknown appId", async () => {
    const response = await writeFormResponse(
      RESERVED_MISSING_ID,
      CANONICAL_FORM_ID,
      new Request(
        applicationsUrl(
          VERSION,
          `/${RESERVED_MISSING_ID}/forms/${CANONICAL_FORM_ID}`,
        ),
        {
          method: "PUT",
          body: JSON.stringify({}),
          headers: { "Content-Type": "application/json" },
        },
      ),
      VERSION,
    );

    expect(response.status).toBe(404);
  });
});
