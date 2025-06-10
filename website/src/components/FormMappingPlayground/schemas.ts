import type { JsonSchema, VerticalLayout } from "@jsonforms/core";

export interface SchemaOption {
  id: string;
  label: string;
  formSchema: JsonSchema;
  formUI: VerticalLayout;
  defaultData: unknown;
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
        applicantType: {
          type: "string",
          title: "Applicant Type",
          enum: [
            "Nonprofit",
            "For-profit",
            "Government",
            "Individual",
            "Other",
          ],
        },
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
          scope: "#/properties/applicantType",
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
      applicantType: "Nonprofit",
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
        applicantType: {
          switch: {
            field: "project.applicantType",
            case: {
              "nonprofit-general": "Nonprofit",
              "nonprofit-religious": "Nonprofit",
              "nonprofit-educational": "Nonprofit",
              "business-small": "For-profit",
              "business-general": "For-profit",
              "government-tribal": "Government",
              "government-state": "Government",
              "government-local": "Government",
              "government-general": "Government",
              individual: "Individual",
              custom: "Other",
            },
            default: "custom",
          },
        },
        requestedAmount: { field: "project.amountRequested" },
        startDate: { field: "project.startDate" },
      },
      mappingToCommon: {
        pointOfContact: {
          firstName: { field: "applicantName.firstName" },
          lastName: { field: "applicantName.lastName" },
        },
        project: {
          title: { field: "projectTitle" },
          applicantType: {
            switch: {
              field: "applicantType",
              case: {
                Nonprofit: "nonprofit-general",
                "For-profit": "business-general",
                Government: "government-general",
                Individual: "individual",
                Other: "custom",
              },
              default: "custom",
            },
          },
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
        project_name: { type: "string", title: "Research Project Name" },
        institution_type: {
          type: "string",
          title: "Institution Type",
          enum: [
            "University",
            "Nonprofit",
            "Government",
            "Corporation",
            "Independent Researcher",
            "Not Listed",
          ],
        },
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
      required: ["project_name", "principal_investigator"],
    },
    formUI: {
      type: "VerticalLayout",
      elements: [
        { type: "Control", scope: "#/properties/project_name" },
        { type: "Control", scope: "#/properties/institution_type" },
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
      project_name: "Project B",
      institution_type: "University",
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
        project_name: { field: "project.title" },
        institution_type: {
          switch: {
            field: "project.applicantType",
            case: {
              "nonprofit-general": "Nonprofit",
              "nonprofit-religious": "Nonprofit",
              "nonprofit-educational": "University",
              "business-small": "Corporation",
              "business-general": "Corporation",
              "government-tribal": "Government",
              "government-state": "Government",
              "government-local": "Government",
              "government-general": "Government",
              individual: "Independent Researcher",
              custom: "Not Listed",
            },
          },
        },
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
          title: { field: "project_name" },
          applicantType: {
            switch: {
              field: "institution_type",
              case: {
                University: "nonprofit-educational",
                Nonprofit: "nonprofit-general",
                Corporation: "business-general",
                Government: "government-general",
                "Independent Researcher": "individual",
                "Not Listed": "custom",
              },
              default: "custom",
            },
          },
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
        orgType: {
          type: "string",
          title: "Applicant Type",
          enum: [
            "Nonprofit",
            "Church",
            "Local Government",
            "Tribal Government",
            "Small Business",
            "Individual",
            "Not Listed",
          ],
        },
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
        { type: "Control", scope: "#/properties/orgType" },
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
        orgType: {
          switch: {
            field: "project.applicantType",
            case: {
              "nonprofit-general": "Nonprofit",
              "nonprofit-educational": "Church",
              "business-small": "Small Business",
              "business-general": "Not Listed",
              "government-tribal": "Tribal Government",
              "government-state": "Local Government",
              "government-local": "Local Government",
              "government-general": "Local Government",
              individual: "Individual",
              custom: "Not Listed",
            },
            default: "custom",
          },
        },
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
          applicantType: {
            switch: {
              field: "orgType",
              case: {
                Church: "nonprofit-religious",
                Nonprofit: "nonprofit-general",
                "Small Business": "business-small",
                "Local Government": "government-local",
                "Tribal Government": "government-tribal",
                Individual: "individual",
                "Not Listed": "custom",
              },
              default: "custom",
            },
          },
          amountRequested: { field: "fundingNeeded" },
          startDate: { field: "startPeriod" },
        },
      },
    },
  },
  {
    id: "formD",
    label: "Form D - Education Grant",
    formSchema: {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      properties: {
        projectDetails: {
          type: "object",
          properties: {
            title: { type: "string", title: "Project title" },
            requestedBy: {
              type: "string",
              title: "Project type",
              enum: [
                "NGO",
                "Corporation",
                "College or University",
                "Individual",
                "Government",
                "Other",
              ],
            },
            fundingNeeded: { type: "number", title: "Funding needed (USD)" },
            startDate: {
              type: "string",
              format: "date",
              title: "Anticipated start date",
            },
          },
          required: ["Title", "StartDate"],
        },
        contact: {
          type: "object",
          properties: {
            givenName: { type: "string", title: "Given name" },
            middleName: { type: "string", title: "Middle name" },
            familyName: { type: "string", title: "Family name" },
          },
          required: ["givenName", "familyName"],
        },
      },
      required: ["projectDetails", "contact"],
    },
    formUI: {
      type: "VerticalLayout",
      elements: [
        {
          type: "Group",
          label: "Project Details",
          elements: [
            {
              type: "Control",
              scope: "#/properties/projectDetails/properties/title",
            },
            {
              type: "Control",
              scope: "#/properties/projectDetails/properties/requestedBy",
            },
            {
              type: "Control",
              scope: "#/properties/projectDetails/properties/fundingNeeded",
            },
            {
              type: "Control",
              scope: "#/properties/projectDetails/properties/startDate",
            },
          ],
        },
        {
          type: "Group",
          label: "Application contact",
          elements: [
            {
              type: "Control",
              scope: "#/properties/contact/properties/givenName",
            },
            {
              type: "Control",
              scope: "#/properties/contact/properties/middleName",
            },
            {
              type: "Control",
              scope: "#/properties/contact/properties/familyName",
            },
          ],
        },
      ],
    } as unknown as VerticalLayout,
    defaultData: {
      projectDetails: {
        title: "Project D",
        fundingNeeded: 80000,
        startDate: "2025-06-01",
      },
      contact: {
        givenName: "Diana",
        familyName: "Darby",
      },
    },
    mappings: {
      mappingFromCommon: {
        projectDetails: {
          title: { field: "project.title" },
          requestedBy: {
            switch: {
              field: "project.applicantType",
              case: {
                "nonprofit-general": "NGO",
                "nonprofit-religious": "NGO",
                "nonprofit-educational": "College or University",
                "business-small": "Corporation",
                "business-general": "Corporation",
                "government-tribal": "Government",
                "government-state": "Government",
                "government-local": "Government",
                "government-general": "Government",
                individual: "Individual",
                custom: "Other",
              },
              default: "custom",
            },
          },
          fundingNeeded: { field: "project.amountRequested" },
          startDate: { field: "project.startDate" },
        },
        contact: {
          givenName: { field: "pointOfContact.firstName" },
          middleName: { field: "pointOfContact.middleName" },
          familyName: { field: "pointOfContact.lastName" },
        },
      },
      mappingToCommon: {
        project: {
          title: { field: "projectDetails.title" },
          applicantType: {
            switch: {
              field: "projectDetails.requestedBy",
              case: {
                NGO: "nonprofit-general",
                Corporation: "business-general",
                "College or University": "nonprofit-educational",
                Individual: "individual",
                Government: "government-general",
                Other: "custom",
              },
              default: "custom",
            },
          },
          amountRequested: { field: "projectDetails.fundingNeeded" },
          startDate: { field: "projectDetails.startDate" },
        },
        pointOfContact: {
          firstName: { field: "contact.givenName" },
          middleName: { field: "contact.middleName" },
          lastName: { field: "contact.familyName" },
        },
      },
    },
  },
];
