import "../index.tsp";

namespace CommonGrants.Models;

// #########################################################
// Form
// #########################################################

/** A form for collecting data from a user. */
@example(Examples.Form.form)
@Versioning.added(CommonGrants.Versions.v0_2)
model Form {
  /** The form's unique identifier. */
  id: Types.uuid;

  /** The form's name. */
  name: string;

  /** The form's description. */
  description?: string;

  /** The form's instructions. */
  instructions?: string | Fields.File[];

  /** The form's JSON schema used to render the form and validate responses. */
  jsonSchema?: FormJsonSchema;

  /** The form's UI schema used to render the form in the browser. */
  uiSchema?: FormUISchema;

  /** A mapping from form schema to CommonGrants schema. */
  mappingToCommonGrants?: Models.MappingSchema;

  /** A mapping from CommonGrants schema to form schema. */
  mappingFromCommonGrants?: Models.MappingSchema;

  /** Custom attributes about the form itself, not custom fields within the form. */
  customFields?: Record<Fields.CustomField>;
}

// #########################################################
// FormJsonSchema
// #########################################################

/** A JSON schema used to validate form responses. */
@example(Examples.Form.formSchema)
@Versioning.added(CommonGrants.Versions.v0_2)
model FormJsonSchema {
  ...Record<unknown>;
}

// #########################################################
// FormUISchema
// #########################################################

/** A UI schema used to render the form in the browser. */
@example(Examples.Form.uiSchema)
@Versioning.added(CommonGrants.Versions.v0_2)
model FormUISchema {
  ...Record<unknown>;
}

// #########################################################
// Examples
// #########################################################

namespace Examples.Form {
  const form = #{
    id: "b7c1e2f4-8a3d-4e2a-9c5b-1f2e3d4c5b6a",
    name: "Form A",
    description: "Form A description",
    instructions: "Form A instructions",
    jsonSchema: formSchema,
    uiSchema: uiSchema,
    mappingToCommonGrants: mappingToCommonGrants,
    mappingFromCommonGrants: mappingFromCommonGrants,
  };

  const formSchema = #{
    $id: "formA.json",
    type: "object",
    properties: #{
      name: #{ first: #{ type: "string" }, last: #{ type: "string" } },
      email: #{ type: "string" },
      phone: #{ type: "string" },
    },
  };

  const uiSchema = #{
    type: "VerticalLayout",
    elements: #[
      #{
        type: "Group",
        label: "Name",
        elements: #[
          #{ type: "Control", scope: "#/properties/name/first" },
          #{ type: "Control", scope: "#/properties/name/last" }
        ],
      },
      #{ type: "Control", scope: "#/properties/email" },
      #{ type: "Control", scope: "#/properties/phone" }
    ],
  };

  const mappingToCommonGrants = #{
    name: #{
      firstName: #{ field: "name.first" },
      lastName: #{ field: "name.last" },
    },
    emails: #{ primary: #{ field: "email" } },
    phones: #{ primary: #{ field: "phone" } },
  };

  const mappingFromCommonGrants = #{
    name: #{
      first: #{ field: "name.firstName" },
      last: #{ field: "name.lastName" },
    },
    email: #{ field: "emails.primary" },
    phone: #{ field: "phones.primary" },
  };
}
