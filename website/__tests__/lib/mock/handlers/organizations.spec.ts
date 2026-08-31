/**
 * Handler suite for the organizations endpoints. The /orgs routes are
 * v0.4-only, so every call targets "0.4.0" directly against the handler
 * functions; router wiring is covered by the router spec.
 */
import { describe, it, expect } from "vitest";
import {
  listOrganizations,
  getOrganization,
  updateOrganization,
  submitOrgChange,
  listOrgChanges,
  getOrgChange,
  ECHOED_REVISION_ID,
} from "@/lib/mock/handlers/organizations";
import {
  ORGANIZATION_FIXTURES,
  CANONICAL_ORGANIZATION_ID,
  CANONICAL_ORG_REVISION_ID,
  DOCUMENTED_ORGANIZATION_ID,
  getOrganizationById,
  revisionsForOrg,
} from "@/lib/mock/data/organizations";
import { RESERVED_MISSING_ID } from "@/lib/mock/data/ids";
import type { Version } from "@/lib/mock/data/fixtures";

const VERSION: Version = "0.4.0";

/** Builds a request URL; the host/base path are placeholders. */
function orgsUrl(suffix = ""): string {
  return `https://docs.example/api/v${VERSION}/common-grants/orgs${suffix}`;
}

describe("GET /v{version}/common-grants/orgs (list)", () => {
  it("returns a 200 with the protocol paginated envelope, ordered by name ascending", async () => {
    const response = listOrganizations(new Request(orgsUrl()), VERSION);

    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      status: number;
      message: string;
      items: Array<{ name: string }>;
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
    expect(body.items).toHaveLength(ORGANIZATION_FIXTURES.length);

    for (let i = 1; i < body.items.length; i++) {
      expect(
        body.items[i - 1].name.localeCompare(body.items[i].name),
      ).toBeLessThanOrEqual(0);
    }

    expect(body.paginationInfo).toEqual({
      page: 1,
      pageSize: 100,
      totalItems: ORGANIZATION_FIXTURES.length,
      totalPages: 1,
    });
  });

  it("returns 400 with the protocol Error shape for page=0", async () => {
    const response = listOrganizations(
      new Request(orgsUrl("?page=0")),
      VERSION,
    );

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

  // `?registry=&id=` is the spec's documented external-identifier lookup. The
  // expected record comes from the fixture set rather than being hardcoded.
  it("narrows to exactly the organization carrying the given registry + id pair", async () => {
    const expected = ORGANIZATION_FIXTURES.find(
      (org) => org.identifiers?.["org:us:ein"]?.id === "123456789",
    );
    expect(expected).toBeDefined();

    const response = listOrganizations(
      new Request(orgsUrl("?registry=org:us:ein&id=123456789")),
      VERSION,
    );

    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      items: Array<{ id: string }>;
    };

    expect(body.items).toHaveLength(1);
    expect(body.items[0].id).toBe(expected!.id);
  });

  it("returns 400 with a {field: 'id', ...} error when registry is given without id", async () => {
    const response = listOrganizations(
      new Request(orgsUrl("?registry=org:us:ein")),
      VERSION,
    );

    expect(response.status).toBe(400);

    const body = (await response.json()) as {
      status: number;
      errors: Array<{ field: string; message: string }>;
    };

    expect(body.status).toBe(400);
    expect(body.errors.some((error) => error.field === "id")).toBe(true);
  });

  it("returns 200 with zero items for an unrecognized registry code, rather than 400", async () => {
    const response = listOrganizations(
      new Request(orgsUrl("?registry=org:does-not-exist&id=anything")),
      VERSION,
    );

    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      items: unknown[];
      paginationInfo: { totalItems: number };
    };

    expect(body.items).toHaveLength(0);
    expect(body.paginationInfo.totalItems).toBe(0);
  });
});

describe("GET /v{version}/common-grants/orgs/{orgId} (read)", () => {
  it("returns 200 for the id Swagger UI pre-fills", async () => {
    const response = getOrganization(
      CANONICAL_ORGANIZATION_ID,
      new Request(orgsUrl(`/${CANONICAL_ORGANIZATION_ID}`)),
      VERSION,
    );

    expect(response.status).toBe(200);

    const body = (await response.json()) as { data: { id: string } };

    expect(body.data.id).toBe(CANONICAL_ORGANIZATION_ID);
  });

  it("returns 400 with a field-level validation error for a malformed (non-UUID) orgId", async () => {
    const response = getOrganization(
      "not-a-uuid",
      new Request(orgsUrl("/not-a-uuid")),
      VERSION,
    );

    expect(response.status).toBe(400);

    const body = (await response.json()) as {
      status: number;
      errors: Array<{ field: string; message: string }>;
    };

    expect(body.status).toBe(400);
    expect(body.errors).toEqual([
      { field: "orgId", message: "Must be a valid UUID" },
    ]);
  });

  it("returns 404 with an orgId field error for a well-formed but unknown UUID", async () => {
    const response = getOrganization(
      RESERVED_MISSING_ID,
      new Request(orgsUrl(`/${RESERVED_MISSING_ID}`)),
      VERSION,
    );

    expect(response.status).toBe(404);

    const body = (await response.json()) as {
      status: number;
      errors: Array<{ field: string; message: string }>;
    };

    expect(body.status).toBe(404);
    expect(body.errors.some((error) => error.field === "orgId")).toBe(true);
  });

  it("accepts a well-formed ?at timestamp and returns 200, since the mock has no history to read as-of", async () => {
    const response = getOrganization(
      CANONICAL_ORGANIZATION_ID,
      new Request(
        orgsUrl(`/${CANONICAL_ORGANIZATION_ID}?at=2026-01-01T00:00:00Z`),
      ),
      VERSION,
    );

    expect(response.status).toBe(200);

    const body = (await response.json()) as { data: { id: string } };
    expect(body.data.id).toBe(CANONICAL_ORGANIZATION_ID);
  });

  it("returns 400 with an at field error for a malformed ?at value", async () => {
    const response = getOrganization(
      CANONICAL_ORGANIZATION_ID,
      new Request(orgsUrl(`/${CANONICAL_ORGANIZATION_ID}?at=not-a-date`)),
      VERSION,
    );

    expect(response.status).toBe(400);

    const body = (await response.json()) as {
      status: number;
      errors: Array<{ field: string; message: string }>;
    };

    expect(body.status).toBe(400);
    expect(body.errors.some((error) => error.field === "at")).toBe(true);
  });
});

describe("PATCH /v{version}/common-grants/orgs/{orgId} (update)", () => {
  async function runUpdate(orgId: string, body: unknown) {
    return updateOrganization(
      orgId,
      new Request(orgsUrl(`/${orgId}`), {
        method: "PATCH",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      }),
      VERSION,
    );
  }

  it("returns 200 with an accepted OrgRevision whose snapshot has the patch applied and other fields unchanged", async () => {
    const canonical = getOrganizationById(CANONICAL_ORGANIZATION_ID)!;
    const patch = { mission: "New mission" };

    const response = await runUpdate(CANONICAL_ORGANIZATION_ID, patch);

    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      status: number;
      data: {
        status: { value: string };
        patch: Record<string, unknown>;
        snapshot: { mission?: string; name: string };
      };
    };

    expect(body.status).toBe(200);
    expect(body.data.status.value).toBe("accepted");
    expect(body.data.patch).toEqual(patch);
    expect(body.data.snapshot.mission).toBe("New mission");
    expect(body.data.snapshot.name).toBe(canonical.name);
  });

  it("deletes the member from the snapshot when the merge patch sets it to null", async () => {
    const response = await runUpdate(CANONICAL_ORGANIZATION_ID, {
      mission: null,
    });

    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      data: { snapshot: Record<string, unknown> };
    };

    expect(body.data.snapshot).not.toHaveProperty("mission");
  });

  /**
   * RFC 7396's recursive rules, which the top-level set/delete tests above do
   * not reach. These are the parts of merge patch that are easy to get wrong:
   * a nested object merges key by key rather than replacing its target, a
   * nested null deletes just that key, and an array replaces wholesale
   * instead of merging index by index.
   */
  describe("RFC 7396 recursion", () => {
    /** Fetches the snapshot a patch produces, asserting the 200 on the way. */
    async function snapshotAfter(
      orgId: string,
      patch: unknown,
    ): Promise<Record<string, never>> {
      const response = await runUpdate(orgId, patch);
      expect(response.status).toBe(200);

      const body = (await response.json()) as {
        data: { snapshot: Record<string, never> };
      };
      return body.data.snapshot;
    }

    it("merges a nested object key by key instead of replacing it", async () => {
      const canonical = getOrganizationById(CANONICAL_ORGANIZATION_ID)!;
      const primary = canonical.addresses!.primary;

      const snapshot = await snapshotAfter(CANONICAL_ORGANIZATION_ID, {
        addresses: { primary: { city: "Newtown" } },
      });

      const patched = (
        snapshot as unknown as {
          addresses: { primary: Record<string, string> };
        }
      ).addresses.primary;

      expect(patched.city).toBe("Newtown");
      // Untouched siblings survive; a replace would have dropped them.
      expect(patched.street1).toBe(primary.street1);
      expect(patched.postalCode).toBe(primary.postalCode);
    });

    it("leaves sibling keys of a merged branch alone", async () => {
      const canonical = getOrganizationById(CANONICAL_ORGANIZATION_ID)!;

      const snapshot = await snapshotAfter(CANONICAL_ORGANIZATION_ID, {
        addresses: { primary: { city: "Newtown" } },
      });

      const addresses = (
        snapshot as unknown as {
          addresses: { otherAddresses?: Record<string, unknown> };
        }
      ).addresses;

      expect(addresses.otherAddresses).toEqual(
        canonical.addresses!.otherAddresses,
      );
    });

    it("deletes only the nested key a null targets", async () => {
      const canonical = getOrganizationById(CANONICAL_ORGANIZATION_ID)!;

      const snapshot = await snapshotAfter(CANONICAL_ORGANIZATION_ID, {
        addresses: { primary: { street2: null } },
      });

      const patched = (
        snapshot as unknown as {
          addresses: { primary: Record<string, string> };
        }
      ).addresses.primary;

      expect(patched).not.toHaveProperty("street2");
      expect(patched.street1).toBe(canonical.addresses!.primary.street1);
    });

    it("replaces an array wholesale rather than merging it index by index", async () => {
      const documented = getOrganizationById(DOCUMENTED_ORGANIZATION_ID)!;
      // The fixture carries two entries, one of them archived.
      expect(documented.identifiers!["org:us:ein"]!.allIds).toHaveLength(2);

      const snapshot = await snapshotAfter(DOCUMENTED_ORGANIZATION_ID, {
        identifiers: {
          "org:us:ein": { allIds: [{ id: "999888777", status: "active" }] },
        },
      });

      const allIds = (
        snapshot as unknown as {
          identifiers: {
            "org:us:ein": { allIds: Array<{ id: string; status: string }> };
          };
        }
      ).identifiers["org:us:ein"].allIds;

      expect(allIds).toEqual([{ id: "999888777", status: "active" }]);
    });

    it("adds a nested key that the target does not have", async () => {
      const snapshot = await snapshotAfter(DOCUMENTED_ORGANIZATION_ID, {
        addresses: { primary: { street2: "Building C" } },
      });

      const patched = (
        snapshot as unknown as {
          addresses: { primary: Record<string, string> };
        }
      ).addresses.primary;

      expect(patched.street2).toBe("Building C");
    });
  });

  it("returns identical bodies across two calls with the same body (stateless determinism)", async () => {
    const patch = { mission: "Repeatable mission" };

    const responseA = await runUpdate(CANONICAL_ORGANIZATION_ID, patch);
    const responseB = await runUpdate(CANONICAL_ORGANIZATION_ID, patch);

    const bodyA = await responseA.json();
    const bodyB = await responseB.json();

    expect(bodyA).toEqual(bodyB);
  });

  it("returns 400 'Malformed JSON body' for a non-object body", async () => {
    const response = await updateOrganization(
      CANONICAL_ORGANIZATION_ID,
      new Request(orgsUrl(`/${CANONICAL_ORGANIZATION_ID}`), {
        method: "PATCH",
        body: "[]",
        headers: { "Content-Type": "application/json" },
      }),
      VERSION,
    );

    expect(response.status).toBe(400);

    const body = (await response.json()) as { status: number; message: string };
    expect(body.status).toBe(400);
    expect(body.message).toBe("Malformed JSON body");
  });

  it("returns 404 for an unknown orgId", async () => {
    const response = await runUpdate(RESERVED_MISSING_ID, { mission: "x" });

    expect(response.status).toBe(404);
  });

  it("never carries an orgId property on the returned revision (fixture-only bookkeeping field)", async () => {
    const response = await runUpdate(CANONICAL_ORGANIZATION_ID, {
      mission: "No leak",
    });

    const body = (await response.json()) as { data: Record<string, unknown> };
    expect(body.data).not.toHaveProperty("orgId");
  });
});

describe("POST /v{version}/common-grants/orgs/{orgId}/changes (submit)", () => {
  it("returns 202 with a pending revision and a Location header pointing at the new change", async () => {
    const response = await submitOrgChange(
      CANONICAL_ORGANIZATION_ID,
      new Request(orgsUrl(`/${CANONICAL_ORGANIZATION_ID}/changes`), {
        method: "POST",
        body: JSON.stringify({ mission: "Proposed mission" }),
        headers: { "Content-Type": "application/json" },
      }),
      VERSION,
    );

    expect(response.status).toBe(202);

    const body = (await response.json()) as {
      status: number;
      data: { status: { value: string } };
    };

    expect(body.status).toBe(202);
    expect(body.data.status.value).toBe("pending");

    const location = response.headers.get("Location");
    expect(location).toBeDefined();
    expect(location).not.toBeNull();
    expect(location!.endsWith(`/${ECHOED_REVISION_ID}`)).toBe(true);
  });

  it("returns 404 for an unknown orgId", async () => {
    const response = await submitOrgChange(
      RESERVED_MISSING_ID,
      new Request(orgsUrl(`/${RESERVED_MISSING_ID}/changes`), {
        method: "POST",
        body: JSON.stringify({ mission: "x" }),
        headers: { "Content-Type": "application/json" },
      }),
      VERSION,
    );

    expect(response.status).toBe(404);
  });

  it("returns 400 for a malformed JSON body", async () => {
    const response = await submitOrgChange(
      CANONICAL_ORGANIZATION_ID,
      new Request(orgsUrl(`/${CANONICAL_ORGANIZATION_ID}/changes`), {
        method: "POST",
        body: "{not valid json",
        headers: { "Content-Type": "application/json" },
      }),
      VERSION,
    );

    expect(response.status).toBe(400);
  });
});

describe("GET /v{version}/common-grants/orgs/{orgId}/changes (list changes)", () => {
  it("returns a 200 paginated envelope of the org's revisions, newest createdAt first", async () => {
    const expected = revisionsForOrg(CANONICAL_ORGANIZATION_ID);

    const response = listOrgChanges(
      CANONICAL_ORGANIZATION_ID,
      new Request(orgsUrl(`/${CANONICAL_ORGANIZATION_ID}/changes`)),
      VERSION,
    );

    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      status: number;
      items: Array<{ id: string; createdAt: string }>;
    };

    expect(body.status).toBe(200);
    expect(body.items).toHaveLength(expected.length);
    expect(body.items.map((item) => item.id)).toEqual(
      expected.map((revision) => revision.id),
    );

    for (let i = 1; i < body.items.length; i++) {
      expect(
        new Date(body.items[i - 1].createdAt).getTime(),
      ).toBeGreaterThanOrEqual(new Date(body.items[i].createdAt).getTime());
    }
  });

  it("never carries an orgId property on any listed revision", async () => {
    const response = listOrgChanges(
      CANONICAL_ORGANIZATION_ID,
      new Request(orgsUrl(`/${CANONICAL_ORGANIZATION_ID}/changes`)),
      VERSION,
    );

    const body = (await response.json()) as {
      items: Array<Record<string, unknown>>;
    };

    for (const item of body.items) {
      expect(item).not.toHaveProperty("orgId");
    }
  });

  it("returns 404 for an unknown orgId", async () => {
    const response = listOrgChanges(
      RESERVED_MISSING_ID,
      new Request(orgsUrl(`/${RESERVED_MISSING_ID}/changes`)),
      VERSION,
    );

    expect(response.status).toBe(404);
  });
});

describe("GET /v{version}/common-grants/orgs/{orgId}/changes/{changeId} (view change)", () => {
  it("returns 200 for the id Swagger UI pre-fills into both path parameter boxes", () => {
    const response = getOrgChange(
      CANONICAL_ORGANIZATION_ID,
      CANONICAL_ORG_REVISION_ID,
      VERSION,
    );

    expect(response.status).toBe(200);
  });

  it("echoes the requested changeId in the response body", async () => {
    const response = getOrgChange(
      CANONICAL_ORGANIZATION_ID,
      CANONICAL_ORG_REVISION_ID,
      VERSION,
    );

    const body = (await response.json()) as { data: { id: string } };
    expect(body.data.id).toBe(CANONICAL_ORG_REVISION_ID);
  });

  it("returns 404 for a changeId that belongs to a different organization", () => {
    const foreignChangeId = revisionsForOrg(DOCUMENTED_ORGANIZATION_ID)[0]!.id;

    const response = getOrgChange(
      CANONICAL_ORGANIZATION_ID,
      foreignChangeId,
      VERSION,
    );

    expect(response.status).toBe(404);
  });

  it("returns 400 with a changeId field error for a malformed (non-UUID) changeId", async () => {
    const response = getOrgChange(
      CANONICAL_ORGANIZATION_ID,
      "not-a-uuid",
      VERSION,
    );

    expect(response.status).toBe(400);

    const body = (await response.json()) as {
      errors: Array<{ field: string; message: string }>;
    };

    expect(body.errors.some((error) => error.field === "changeId")).toBe(true);
  });
});
