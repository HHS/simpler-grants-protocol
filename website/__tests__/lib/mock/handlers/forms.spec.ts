/**
 * Handler + fixture suite for the forms endpoints (#334): `GET /forms`
 * (list) and `GET /forms/{formId}` (detail). Modeled on `awards.spec.ts` —
 * forms carry no search endpoint in the spec
 * (`lib/core/lib/core/routes/forms.tsp` instantiates only `list` and `read`),
 * so there is no `searchForms` suite here.
 */
import { describe, it, expect } from "vitest";
import {
  FORM_FIXTURES,
  CANONICAL_FORM_ID,
  DOCUMENTED_FORM_ID,
  getFormById,
} from "@/lib/mock/data/forms";
import { listForms, getForm } from "@/lib/mock/handlers/forms";
import { RESERVED_MISSING_ID } from "@/lib/mock/data/ids";
import type { Version } from "@/lib/mock/data/fixtures";

const VERSION: Version = "0.4.0";

/** Builds a request URL carrying the given query/path suffix. Only used to
 * construct valid `Request` objects for the handlers below — since they are
 * called directly rather than through the router, the host/base path are
 * placeholders. */
function formsUrl(suffix = ""): string {
  return `https://docs.example/api/v${VERSION}/common-grants/forms${suffix}`;
}

describe("FORM_FIXTURES", () => {
  it("gives every record the FormBase-required fields", () => {
    for (const form of FORM_FIXTURES) {
      expect(typeof form.id).toBe("string");
      expect(typeof form.name).toBe("string");
      expect(typeof form.createdAt).toBe("string");
      expect(typeof form.lastModifiedAt).toBe("string");
    }
  });

  it("has unique ids across the fixture set, with the reserved 404 id absent", () => {
    const ids = FORM_FIXTURES.map((form) => form.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(getFormById(RESERVED_MISSING_ID)).toBeUndefined();
  });

  // The docs site renders a form from exactly a `jsonSchema` / `uiSchema`
  // pair (see `src/lib/forms/`), so at least one fixture must carry both.
  it("includes at least one record carrying both a jsonSchema and a uiSchema", () => {
    const rendered = FORM_FIXTURES.filter(
      (form) => form.jsonSchema !== undefined && form.uiSchema !== undefined,
    );
    expect(rendered.length).toBeGreaterThan(0);
  });
});

describe("GET /v{version}/common-grants/forms (list)", () => {
  it("returns a 200 with the protocol paginated envelope, ordered by lastModifiedAt descending by default", async () => {
    const response = listForms(new Request(formsUrl()), VERSION);

    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      status: number;
      message: string;
      items: Array<{ lastModifiedAt: string }>;
      paginationInfo: {
        page: number;
        pageSize: number;
        totalItems: number;
        totalPages: number;
      };
    };

    expect(body.status).toBe(200);
    expect(body.message).toBe("Success");
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items).toHaveLength(FORM_FIXTURES.length);

    for (let i = 1; i < body.items.length; i++) {
      expect(
        new Date(body.items[i - 1].lastModifiedAt).getTime(),
      ).toBeGreaterThanOrEqual(
        new Date(body.items[i].lastModifiedAt).getTime(),
      );
    }

    expect(body.paginationInfo).toEqual({
      page: 1,
      pageSize: 100,
      totalItems: FORM_FIXTURES.length,
      totalPages: 1,
    });
  });

  it("honors page/pageSize query params, splitting the fixture set across two distinct pages", async () => {
    const pageOneResponse = listForms(
      new Request(formsUrl("?page=1&pageSize=2")),
      VERSION,
    );
    const pageTwoResponse = listForms(
      new Request(formsUrl("?page=2&pageSize=2")),
      VERSION,
    );

    expect(pageOneResponse.status).toBe(200);
    expect(pageTwoResponse.status).toBe(200);

    const pageOneBody = (await pageOneResponse.json()) as {
      items: Array<{ id: string }>;
      paginationInfo: { totalItems: number };
    };
    const pageTwoBody = (await pageTwoResponse.json()) as {
      items: Array<{ id: string }>;
    };

    expect(pageOneBody.items).toHaveLength(2);
    expect(pageOneBody.paginationInfo.totalItems).toBe(FORM_FIXTURES.length);

    const pageOneIds = pageOneBody.items.map((item) => item.id);
    const pageTwoIds = pageTwoBody.items.map((item) => item.id);
    expect(pageTwoIds).not.toEqual(pageOneIds);
  });

  it("returns 400 with the protocol Error shape for page=0", async () => {
    const response = listForms(new Request(formsUrl("?page=0")), VERSION);

    expect(response.status).toBe(400);

    const body = (await response.json()) as {
      status: number;
      message: string;
      errors: Array<{ field: string; message: string }>;
    };

    expect(body.status).toBe(400);
    expect(body.message).toBe("Invalid pagination parameters");
    expect(body.errors).toEqual([
      { field: "page", message: "Must be at least 1" },
    ]);
  });

  it("returns 400 with a pageSize field error when pageSize is not an integer", async () => {
    const response = listForms(new Request(formsUrl("?pageSize=abc")), VERSION);

    expect(response.status).toBe(400);

    const body = (await response.json()) as {
      status: number;
      errors: Array<{ field: string; message: string }>;
    };

    expect(body.status).toBe(400);
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].field).toBe("pageSize");
    expect(body.errors[0].message).toContain("integer");
  });
});

describe("GET /v{version}/common-grants/forms/{formId} (detail)", () => {
  // Swagger UI pre-fills every path parameter box with the specs' single
  // `CommonGrants.Types.uuid` example (see `data/ids.ts`'s docstring), so this
  // is the id an untouched "Try it out" sends for this route. It must not 404.
  it("returns 200 for the id Swagger UI pre-fills into every path parameter box", async () => {
    const response = getForm(CANONICAL_FORM_ID, VERSION);

    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      status: number;
      data: { id: string };
    };

    expect(body.status).toBe(200);
    expect(body.data.id).toBe(CANONICAL_FORM_ID);
  });

  // The id published on the `FormBase` example itself is a different id from
  // the Swagger-UI-prefill one, so a visitor who copies it out of the
  // rendered example rather than accepting the pre-filled value must also
  // resolve.
  it("returns 200 for the id the FormBase example itself publishes", async () => {
    const response = getForm(DOCUMENTED_FORM_ID, VERSION);

    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      status: number;
      data: { id: string };
    };

    expect(body.status).toBe(200);
    expect(body.data.id).toBe(DOCUMENTED_FORM_ID);
  });

  it("returns 400 with a field-level validation error for a malformed (non-UUID) formId", async () => {
    const response = getForm("not-a-uuid", VERSION);

    expect(response.status).toBe(400);

    const body = (await response.json()) as {
      status: number;
      errors: Array<{ field: string; message: string }>;
    };

    expect(body.status).toBe(400);
    expect(body.errors).toEqual([
      { field: "formId", message: "Must be a valid UUID" },
    ]);
  });

  it("returns 404 with a formId field error for a well-formed but unknown UUID", async () => {
    const response = getForm(RESERVED_MISSING_ID, VERSION);

    expect(response.status).toBe(404);

    const body = (await response.json()) as {
      status: number;
      message: string;
      errors: Array<{ field: string; message: string }>;
    };

    expect(body.status).toBe(404);
    expect(Array.isArray(body.errors)).toBe(true);
    expect(body.errors.some((error) => error.field === "formId")).toBe(true);
  });
});
