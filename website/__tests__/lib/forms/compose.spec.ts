import { describe, it, expect } from "vitest";
import {
  composeUiSchema,
  composeMappingFromCg,
  composeMappingToCg,
} from "@/lib/forms";

// =============================================================================
// composeUiSchema
// =============================================================================

describe("composeUiSchema", () => {
  it("returns an empty VerticalLayout when there are no properties", () => {
    expect(composeUiSchema({})).toEqual({
      type: "VerticalLayout",
      elements: [],
    });
  });

  it("lifts a property's x-ui-schema and re-scopes its Controls under the property name", () => {
    const result = composeUiSchema({
      org: {
        "x-ui-schema": {
          type: "Group",
          label: "Organization",
          elements: [
            {
              type: "Control",
              scope: "#/properties/name",
              label: "Org Name",
            },
          ],
        },
      },
    });

    expect(result).toEqual({
      type: "VerticalLayout",
      elements: [
        {
          type: "Group",
          label: "Organization",
          elements: [
            {
              type: "Control",
              scope: "#/properties/org/properties/name",
              label: "Org Name",
            },
          ],
        },
      ],
    });
  });

  it("re-scopes deeply-nested Controls under nested layouts", () => {
    const result = composeUiSchema({
      contact: {
        "x-ui-schema": {
          type: "Group",
          elements: [
            {
              type: "Group",
              label: "Name",
              elements: [
                {
                  type: "Control",
                  scope: "#/properties/name/properties/firstName",
                },
              ],
            },
          ],
        },
      },
    });

    const group = (result.elements as Record<string, unknown>[])[0];
    const nameGroup = (group.elements as Record<string, unknown>[])[0];
    const control = (nameGroup.elements as Record<string, unknown>[])[0];
    expect(control.scope).toBe(
      "#/properties/contact/properties/name/properties/firstName",
    );
  });

  it("generates a default Control for a property without x-ui-schema", () => {
    const result = composeUiSchema({
      projectRole: { type: "string" },
    });
    expect(result.elements).toEqual([
      { type: "Control", scope: "#/properties/projectRole" },
    ]);
  });

  it("preserves property order in the output elements", () => {
    const result = composeUiSchema({
      org: { "x-ui-schema": { type: "Group", elements: [] } },
      contact: { "x-ui-schema": { type: "Group", elements: [] } },
      projectRole: { type: "string" },
    });
    const labels = (result.elements as Record<string, unknown>[]).map(
      (el) => el.type,
    );
    expect(labels).toEqual(["Group", "Group", "Control"]);
  });

  it("does not mutate the input property schemas", () => {
    const properties = {
      org: {
        "x-ui-schema": {
          type: "Group",
          elements: [
            { type: "Control", scope: "#/properties/name", label: "Name" },
          ],
        },
      },
    };
    const original = JSON.parse(JSON.stringify(properties));
    composeUiSchema(properties);
    expect(properties).toEqual(original);
  });
});

// =============================================================================
// composeMappingFromCg
// =============================================================================

describe("composeMappingFromCg", () => {
  it("returns an empty object when no property has x-mapping-from-cg", () => {
    expect(composeMappingFromCg({})).toEqual({});
    expect(composeMappingFromCg({ projectRole: { type: "string" } })).toEqual(
      {},
    );
  });

  it("nests each child mapping under its property name", () => {
    const result = composeMappingFromCg({
      org: {
        "x-mapping-from-cg": {
          name: { field: "organizations.primary.name" },
        },
      },
    });
    expect(result).toEqual({
      org: { name: { field: "organizations.primary.name" } },
    });
  });

  it("nests deeply-nested child mappings without rewriting CG paths", () => {
    const result = composeMappingFromCg({
      contact: {
        "x-mapping-from-cg": {
          name: {
            firstName: { field: "contacts.primary.name.firstName" },
          },
          email: { field: "contacts.primary.emails.primary" },
        },
      },
    });
    expect(result).toEqual({
      contact: {
        name: { firstName: { field: "contacts.primary.name.firstName" } },
        email: { field: "contacts.primary.emails.primary" },
      },
    });
  });
});

// =============================================================================
// composeMappingToCg
// =============================================================================

describe("composeMappingToCg", () => {
  it("returns an empty object when no property has x-mapping-to-cg", () => {
    expect(composeMappingToCg({})).toEqual({});
  });

  it("rewrites leaf field references to be relative to the parent property", () => {
    const result = composeMappingToCg({
      org: {
        "x-mapping-to-cg": {
          organizations: {
            primary: {
              name: { field: "name" },
            },
          },
        },
      },
    });
    expect(result).toEqual({
      organizations: {
        primary: {
          name: { field: "org.name" },
        },
      },
    });
  });

  it("deep-merges multiple property mappings under shared CG path roots", () => {
    const result = composeMappingToCg({
      org: {
        "x-mapping-to-cg": {
          organizations: {
            primary: {
              name: { field: "name" },
            },
          },
        },
      },
      contact: {
        "x-mapping-to-cg": {
          contacts: {
            primary: {
              email: { field: "email" },
            },
          },
        },
      },
    });
    expect(result).toEqual({
      organizations: {
        primary: { name: { field: "org.name" } },
      },
      contacts: {
        primary: { email: { field: "contact.email" } },
      },
    });
  });

  it("rewrites the field key inside a switch block", () => {
    const result = composeMappingToCg({
      org: {
        "x-mapping-to-cg": {
          organizations: {
            primary: {
              orgType: {
                switch: {
                  field: "orgType",
                  case: { nonprofit: "Nonprofit" },
                },
              },
            },
          },
        },
      },
    });
    const orgType = (
      (result.organizations as Record<string, unknown>).primary as Record<
        string,
        unknown
      >
    ).orgType as { switch: { field: string } };
    expect(orgType.switch.field).toBe("org.orgType");
  });

  it("does not mutate the input property schemas", () => {
    const properties = {
      org: {
        "x-mapping-to-cg": {
          organizations: { primary: { name: { field: "name" } } },
        },
      },
    };
    const original = JSON.parse(JSON.stringify(properties));
    composeMappingToCg(properties);
    expect(properties).toEqual(original);
  });
});
