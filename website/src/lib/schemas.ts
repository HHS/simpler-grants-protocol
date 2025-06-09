import type {
  JsonSchema,
  UISchemaElement,
  VerticalLayout,
} from "@jsonforms/core";

export interface SchemaOption {
  id: string;
  label: string;
  formSchema: JsonSchema;
  formUI: UISchemaElement;
  defaultData: any;
}

/**
 * Three tiny, diverging grant-application schemas.
 * They ask the same things but shuffle wording & order
 * so you can see the mapper's effect.
 */
export const schemas: SchemaOption[] = [
  {
    id: "formA",
    label: "Form A - Basic Grant",
    formSchema: {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      properties: {
        applicantName: {
          type: "object",
          properties: {
            firstName: { type: "string", title: "First Name" },
            lastName: { type: "string", title: "Last Name" },
          },
          title: "Applicant Name",
          required: ["firstName", "lastName"],
        },
        projectTitle: { type: "string", title: "Project Title" },
        requestedAmount: { type: "number", title: "Requested Amount (USD)" },
        startDate: {
          type: "string",
          format: "date",
          title: "Proposed Start Date",
        },
      },
      required: ["applicantName", "projectTitle"],
    },
    formUI: { type: "VerticalLayout" } as VerticalLayout,
    defaultData: {
      applicantName: "John",
      projectTitle: "",
      requestedAmount: 0,
      startDate: "",
    },
  },
  {
    id: "formB",
    label: "Form B - Research Grant",
    formSchema: {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      properties: {
        projectName: { type: "string", title: "Research Project Name" },
        principalInvestigator: {
          type: "string",
          title: "Principal Investigator",
        },
        budget: { type: "number", title: "Total Budget (USD)" },
        kickoff: { type: "string", format: "date", title: "Kick-off Date" },
      },
      required: ["projectName", "principalInvestigator"],
    },
    formUI: { type: "VerticalLayout" } as VerticalLayout,
    defaultData: {
      projectName: "",
      principalInvestigator: "",
      budget: 0,
      kickoff: "",
    },
  },
  {
    id: "formC",
    label: "Form C - Community Grant",
    formSchema: {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      properties: {
        orgName: { type: "string", title: "Organization Name" },
        contactPerson: { type: "string", title: "Contact Person" },
        fundingNeeded: { type: "number", title: "Funding Needed (USD)" },
        startPeriod: { type: "string", format: "date", title: "Start Period" },
      },
      required: ["orgName", "contactPerson"],
    },
    formUI: { type: "VerticalLayout" } as VerticalLayout,
    defaultData: {
      orgName: "",
      contactPerson: "",
      fundingNeeded: 0,
      startPeriod: "",
    },
  },
];
