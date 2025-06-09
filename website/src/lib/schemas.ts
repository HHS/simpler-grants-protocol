import type { JsonSchema, VerticalLayout } from "@jsonforms/core";

export interface SchemaOption {
  id: string;
  label: string;
  formSchema: JsonSchema;
  formUI: VerticalLayout;
  defaultData: any;
  mappings: MappingSet;
}

interface MappingSet {
  mappingToCommon: Record<string, unknown>;
  mappingFromCommon: Record<string, unknown>;
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
    formUI: {
      type: "VerticalLayout",
      elements: [
        {
          type: "Group",
          label: "Applicant Name",
          elements: [
            {
              type: "Control",
              scope: "#/properties/applicantName/properties/firstName",
            },
            {
              type: "Control",
              scope: "#/properties/applicantName/properties/lastName",
            },
          ],
        },
        {
          type: "Control",
          scope: "#/properties/projectTitle",
        },
        {
          type: "Control",
          scope: "#/properties/requestedAmount",
        },
        {
          type: "Control",
          scope: "#/properties/startDate",
        },
      ],
    } as unknown as VerticalLayout,
    defaultData: {
      applicantName: { firstName: "Alice", lastName: "Alvarez" },
      projectTitle: "Project A",
      requestedAmount: 1000,
      startDate: "2025-07-01",
    },
    mappings: {
      mappingFromCommon: {
        applicantName: {
          firstName: { field: "pointOfContact.firstName" },
          lastName: { field: "pointOfContact.lastName" },
        },
        projectTitle: { field: "project.title" },
        requestedAmount: { field: "project.requestedAmount" },
        startDate: { field: "project.startDate" },
      },
      mappingToCommon: {
        pointOfContact: {
          firstName: { field: "applicantName.firstName" },
          lastName: { field: "applicantName.lastName" },
        },
        project: {
          title: { field: "projectTitle" },
          amountRequested: { field: "requestedAmount" },
          startDate: { field: "startDate" },
        },
      },
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
        principal_investigator: {
          type: "object",
          properties: {
            first_name: { type: "string", title: "PI First Name" },
            middle_name: { type: "string", title: "PI Middle Name" },
            last_name: { type: "string", title: "PI Last Name" },
          },
          title: "Principal Investigator",
          required: ["first_name", "last_name"],
        },
        budget: { type: "number", title: "Total Budget (USD)" },
        kickoff: { type: "string", format: "date", title: "Kick-off Date" },
      },
      required: ["projectName", "principal_investigator"],
    },
    formUI: {
      type: "VerticalLayout",
      elements: [
        { type: "Control", scope: "#/properties/projectName" },
        {
          type: "Group",
          label: "Principal Investigator",
          elements: [
            {
              type: "Control",
              scope:
                "#/properties/principal_investigator/properties/first_name",
            },
            {
              type: "Control",
              scope:
                "#/properties/principal_investigator/properties/middle_name",
            },
            {
              type: "Control",
              scope: "#/properties/principal_investigator/properties/last_name",
            },
          ],
        },
        { type: "Control", scope: "#/properties/budget" },
        { type: "Control", scope: "#/properties/kickoff" },
      ],
    } as unknown as VerticalLayout,
    defaultData: {
      projectName: "Project B",
      principal_investigator: {
        first_name: "Bob",
        middle_name: "B.",
        last_name: "Barker",
      },
      budget: 25000,
      kickoff: "2025-06-01",
    },
    mappings: {
      mappingFromCommon: {
        projectName: { field: "project.title" },
        principal_investigator: {
          first_name: { field: "pointOfContact.firstName" },
          middle_name: { field: "pointOfContact.middleName" },
          last_name: { field: "pointOfContact.lastName" },
        },
        budget: { field: "project.amountRequested" },
        kickoff: { field: "project.startDate" },
      },
      mappingToCommon: {
        pointOfContact: {
          firstName: { field: "principal_investigator.first_name" },
          middleName: { field: "principal_investigator.middle_name" },
          lastName: { field: "principal_investigator.last_name" },
        },
        project: {
          title: { field: "projectName" },
          amountRequested: { field: "budget" },
          startDate: { field: "kickoff" },
        },
      },
    },
  },
  {
    id: "formC",
    label: "Form C - Community Grant",
    formSchema: {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      properties: {
        projectTitle: { type: "string", title: "Project Title" },
        contactFirstName: { type: "string", title: "Contact First Name" },
        contactLastName: { type: "string", title: "Contact Last Name" },
        fundingNeeded: { type: "number", title: "Funding Needed (USD)" },
        startPeriod: { type: "string", format: "date", title: "Start Period" },
      },
      required: ["projectTitle", "contactFirstName", "contactLastName"],
    },
    formUI: {
      type: "VerticalLayout",
      elements: [
        { type: "Control", scope: "#/properties/projectTitle" },
        { type: "Control", scope: "#/properties/contactFirstName" },
        { type: "Control", scope: "#/properties/contactLastName" },
        { type: "Control", scope: "#/properties/fundingNeeded" },
        { type: "Control", scope: "#/properties/startPeriod" },
      ],
    } as unknown as VerticalLayout,
    defaultData: {
      projectTitle: "Project C",
      contactFirstName: "Charlie",
      contactLastName: "Chaplin",
      fundingNeeded: 5000,
      startPeriod: "2025-06-01",
    },
    mappings: {
      mappingFromCommon: {
        projectTitle: { field: "project.title" },
        contactFirstName: { field: "pointOfContact.firstName" },
        contactLastName: { field: "pointOfContact.lastName" },
        fundingNeeded: { field: "project.amountRequested" },
        startPeriod: { field: "project.startDate" },
      },
      mappingToCommon: {
        pointOfContact: {
          firstName: { field: "contactFirstName" },
          lastName: { field: "contactLastName" },
        },
        project: {
          title: { field: "projectTitle" },
          amountRequested: { field: "fundingNeeded" },
          startDate: { field: "startPeriod" },
        },
      },
    },
  },
];
