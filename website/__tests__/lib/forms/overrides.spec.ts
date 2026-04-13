import { describe, it, expect } from "vitest";
import { applyUiOverrides, applyMappingOverrides } from "@/lib/forms";

// =============================================================================
// applyUiOverrides
// =============================================================================

describe("applyUiOverrides", () => {
  const baseUi = {
    type: "VerticalLayout",
    elements: [
      {
        type: "Group",
        label: "Contact",
        elements: [
          {
            type: "Group",
            label: "Name",
            elements: [
              {
                type: "Control",
                scope:
                  "#/properties/contact/properties/name/properties/firstName",
                label: "First Name",
              },
              {
                type: "Control",
                scope:
                  "#/properties/contact/properties/name/properties/lastName",
                label: "Last Name",
              },
            ],
          },
          {
            type: "Control",
            scope: "#/properties/contact/properties/email",
            label: "Email",
          },
        ],
      },
    ],
  };

  it("is a no-op when overrides is undefined or empty", () => {
    expect(applyUiOverrides(baseUi, undefined)).toBe(baseUi);
    expect(applyUiOverrides(baseUi, {})).toBe(baseUi);
  });

  it("overrides a leaf Control's label by dotted path", () => {
    const result = applyUiOverrides(baseUi, {
      "contact.name.firstName": { label: "Contact First Name" },
    });
    const group = (result.elements as Record<string, unknown>[])[0];
    const nameGroup = (group.elements as Record<string, unknown>[])[0];
    const firstNameControl = (
      nameGroup.elements as Record<string, unknown>[]
    )[0];
    expect(firstNameControl.label).toBe("Contact First Name");
  });

  it("does not mutate the input UI schema", () => {
    const original = JSON.parse(JSON.stringify(baseUi));
    applyUiOverrides(baseUi, {
      "contact.name.firstName": { label: "Contact First Name" },
    });
    expect(baseUi).toEqual(original);
  });

  it("merges multiple overrides into the same composite", () => {
    const result = applyUiOverrides(baseUi, {
      "contact.name.firstName": { label: "First" },
      "contact.name.lastName": { label: "Last" },
      "contact.email": { label: "Email Address" },
    });
    const group = (result.elements as Record<string, unknown>[])[0];
    const nameGroup = (group.elements as Record<string, unknown>[])[0];
    const [first, last] = nameGroup.elements as Record<string, unknown>[];
    const email = (group.elements as Record<string, unknown>[])[1];
    expect(first.label).toBe("First");
    expect(last.label).toBe("Last");
    expect(email.label).toBe("Email Address");
  });

  it("merges patch fields into the Control without removing existing keys", () => {
    const result = applyUiOverrides(baseUi, {
      "contact.email": { label: "Email Address" },
    });
    const group = (result.elements as Record<string, unknown>[])[0];
    const email = (group.elements as Record<string, unknown>[])[1];
    expect(email).toMatchObject({
      type: "Control",
      scope: "#/properties/contact/properties/email",
      label: "Email Address",
    });
  });

  it("throws a clear error when the override path matches no Control", () => {
    expect(() =>
      applyUiOverrides(baseUi, {
        "contact.does.not.exist": { label: "Anything" },
      }),
    ).toThrow(/contact\.does\.not\.exist/);
  });
});

// =============================================================================
// applyMappingOverrides
// =============================================================================

describe("applyMappingOverrides", () => {
  const baseMapping = {
    contact: {
      name: {
        firstName: { field: "contacts.primary.name.firstName" },
        lastName: { field: "contacts.primary.name.lastName" },
      },
      email: { field: "contacts.primary.emails.primary" },
    },
    org: {
      name: { field: "organizations.primary.name" },
    },
  };

  it("is a no-op when overrides is undefined or empty", () => {
    expect(applyMappingOverrides(baseMapping, undefined)).toBe(baseMapping);
    expect(applyMappingOverrides(baseMapping, {})).toBe(baseMapping);
  });

  it("replaces a leaf entry by dotted path", () => {
    const result = applyMappingOverrides(baseMapping, {
      "contact.name.firstName": {
        field: "contacts.otherContacts.aor.name.firstName",
      },
    });
    const contact = result.contact as Record<string, Record<string, unknown>>;
    expect(contact.name.firstName).toEqual({
      field: "contacts.otherContacts.aor.name.firstName",
    });
  });

  it("leaves sibling leaves untouched", () => {
    const result = applyMappingOverrides(baseMapping, {
      "contact.name.firstName": { field: "x" },
    });
    const contact = result.contact as Record<string, Record<string, unknown>>;
    expect(contact.name.lastName).toEqual({
      field: "contacts.primary.name.lastName",
    });
    expect(contact.email).toEqual({
      field: "contacts.primary.emails.primary",
    });
  });

  it("does not mutate the input mapping", () => {
    const original = JSON.parse(JSON.stringify(baseMapping));
    applyMappingOverrides(baseMapping, {
      "contact.name.firstName": { field: "x" },
    });
    expect(baseMapping).toEqual(original);
  });

  it("supports a top-level (single-segment) path", () => {
    const result = applyMappingOverrides(baseMapping, {
      org: { field: "organizations.fiscalSponsor.name" },
    });
    expect(result.org).toEqual({
      field: "organizations.fiscalSponsor.name",
    });
  });

  it("throws a clear error when an intermediate segment is missing", () => {
    expect(() =>
      applyMappingOverrides(baseMapping, {
        "contact.does.not.exist": { field: "x" },
      }),
    ).toThrow(/contact\.does\.not\.exist/);
  });

  it("throws a clear error when the leaf key is missing", () => {
    expect(() =>
      applyMappingOverrides(baseMapping, {
        "contact.name.middleName": { field: "x" },
      }),
    ).toThrow(/contact\.name\.middleName/);
  });
});
