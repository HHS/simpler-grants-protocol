/**
 * Hand-written form fixtures for `GET /forms` and `GET /forms/{formId}`
 * (#334).
 *
 * Same rules as the opportunity set in `./fixtures`: a fixed, hand-authored
 * dataset in the fullest (`Models.FormBase`) shape, with semantic values taken
 * from the spec's own `@example` decorators (`lib/core/lib/core/models/form.tsp`)
 * rather than generated noise, so the docs' "Example Value" pane and the live
 * response agree.
 *
 * The forms are the leaf of the mock's reference graph — nothing here points at
 * another resource — which is why this module is written first and imported by
 * the competition and application fixtures rather than the other way round.
 * `CompetitionForms` embeds whole `FormBase` records, and an application's form
 * responses carry a `formId`; both read from `FORM_FIXTURES`, so a response can
 * never name a form that doesn't exist.
 *
 * `jsonSchema` / `uiSchema` are real JSON-Forms pairs rather than placeholders,
 * because the docs site already renders forms from exactly this pair (see
 * `src/lib/forms/`), so a visitor who copies one out of the playground gets
 * something that actually renders.
 */

import { CANONICAL_RECORD_ID } from "./ids";
import type { CustomField } from "./fixtures";

/** A JSON Schema for a form's responses (mirrors `Models.FormJsonSchema`). */
export interface FormJsonSchema {
  $id?: string;
  type?: string;
  properties?: Record<string, unknown>;
  required?: string[];
}

/** A JSON-Forms UI schema (mirrors `Models.FormUISchema`). */
export interface FormUISchema {
  type: string;
  elements?: unknown[];
  label?: string;
  scope?: string;
}

/** An attached file (mirrors `Fields.File`). */
export interface FileAttachment {
  downloadUrl: string;
  name: string;
  description?: string;
  sizeInBytes?: number;
  mimeType?: string;
  createdAt: string;
  lastModifiedAt: string;
}

/** One leg of a `Models.MappingSchema` — a field path in the other schema. */
export interface MappingField {
  field: string;
}

/**
 * A (possibly nested) mapping between form and CommonGrants field paths.
 *
 * `undefined` is admitted by the index signature so that object literals
 * assigned to this type can differ in which keys they set — without it, TypeScript
 * widens the fixture array to a union of literal types whose absent keys are
 * `undefined`, and each one then fails the index signature.
 */
export type MappingSchema = {
  [key: string]: MappingField | MappingSchema | undefined;
};

/** A form in its fullest (`Models.FormBase`) shape. */
export interface Form {
  id: string;
  name: string;
  description?: string;
  version?: string;
  /** Prose, or attached documents — the model allows either. */
  instructions?: string | FileAttachment[];
  jsonSchema?: FormJsonSchema;
  uiSchema?: FormUISchema;
  mappingToCommonGrants?: MappingSchema;
  mappingFromCommonGrants?: MappingSchema;
  customFields?: Record<string, CustomField>;
  createdAt: string;
  lastModifiedAt: string;
}

/**
 * The id Swagger UI pre-fills into the `formId` box, and therefore the id of
 * the first form record. See `./ids` for why every resource shares one.
 *
 * Load-bearing twice over: `GET /forms/{formId}` pre-fills it, and so does the
 * `formId` box on `GET|PUT /applications/{appId}/forms/{formId}` — where the
 * `appId` box pre-fills with the same value. So the canonical application must
 * also carry a response to *this* form; `./applications` enforces that.
 */
export const CANONICAL_FORM_ID = CANONICAL_RECORD_ID;

/**
 * The id the specs publish as the `example` on `Models.FormBase` itself. It is
 * not the `Types.uuid` example, so a visitor who copies the id out of the
 * rendered example rather than accepting the pre-filled one sends this instead
 * — record 2 carries it so both resolve.
 */
export const DOCUMENTED_FORM_ID = "b7c1e2f4-8a3d-4e2a-9c5b-1f2e3d4c5b6a";

/** The applicant-details schema shared by the two general-purpose forms. */
const APPLICANT_DETAILS_SCHEMA: FormJsonSchema = {
  $id: "applicantDetails.json",
  type: "object",
  properties: {
    name: {
      type: "object",
      properties: {
        first: { type: "string" },
        last: { type: "string" },
      },
    },
    email: { type: "string", format: "email" },
    phone: { type: "string" },
  },
  required: ["name", "email"],
};

const APPLICANT_DETAILS_UI: FormUISchema = {
  type: "VerticalLayout",
  elements: [
    {
      type: "Group",
      label: "Name",
      elements: [
        { type: "Control", scope: "#/properties/name/properties/first" },
        { type: "Control", scope: "#/properties/name/properties/last" },
      ],
    },
    { type: "Control", scope: "#/properties/email" },
    { type: "Control", scope: "#/properties/phone" },
  ],
};

/**
 * The fixture set: 6 forms, spanning a short applicant-details form, a budget
 * form with numeric fields, and a narrative form — enough that `GET /forms`
 * returns a list worth paginating and that a competition can require more than
 * one distinct form.
 */
export const FORM_FIXTURES: readonly Form[] = Object.freeze<Form[]>([
  // ---- The canonical record (see CANONICAL_FORM_ID) ----
  {
    id: CANONICAL_FORM_ID,
    name: "Applicant details",
    description: "Contact details for the primary applicant",
    version: "1.0.0",
    instructions:
      "Provide the name and contact details of the person we should contact about this application.",
    jsonSchema: APPLICANT_DETAILS_SCHEMA,
    uiSchema: APPLICANT_DETAILS_UI,
    mappingToCommonGrants: {
      name: {
        firstName: { field: "name.first" },
        lastName: { field: "name.last" },
      },
      emails: { primary: { field: "email" } },
      phones: { primary: { field: "phone" } },
    },
    mappingFromCommonGrants: {
      name: {
        first: { field: "name.firstName" },
        last: { field: "name.lastName" },
      },
      email: { field: "emails.primary" },
      phone: { field: "phones.primary" },
    },
    createdAt: "2025-01-01T00:00:00Z",
    lastModifiedAt: "2026-06-01T00:00:00Z",
  },

  // ---- The id published on the FormBase example (see DOCUMENTED_FORM_ID) ----
  {
    id: DOCUMENTED_FORM_ID,
    name: "Form A",
    description: "Form A description",
    version: "1.0.0",
    instructions: "Form A instructions",
    jsonSchema: APPLICANT_DETAILS_SCHEMA,
    uiSchema: APPLICANT_DETAILS_UI,
    mappingToCommonGrants: {
      name: {
        firstName: { field: "name.first" },
        lastName: { field: "name.last" },
      },
      emails: { primary: { field: "email" } },
      phones: { primary: { field: "phone" } },
    },
    mappingFromCommonGrants: {
      name: {
        first: { field: "name.firstName" },
        last: { field: "name.lastName" },
      },
      email: { field: "emails.primary" },
      phone: { field: "phones.primary" },
    },
    createdAt: "2025-01-01T17:01:01Z",
    lastModifiedAt: "2025-01-02T17:30:00Z",
  },

  {
    id: "c9d0e1f2-a3b4-45c6-97d8-e9f0a1b2c3d4",
    name: "Project budget",
    description: "Requested amounts by cost category",
    version: "2.1.0",
    instructions:
      "Enter requested amounts in whole US dollars. Totals must match the narrative budget.",
    jsonSchema: {
      $id: "projectBudget.json",
      type: "object",
      properties: {
        personnel: { type: "number", minimum: 0 },
        equipment: { type: "number", minimum: 0 },
        indirectCosts: { type: "number", minimum: 0 },
        totalRequested: { type: "number", minimum: 0 },
      },
      required: ["personnel", "totalRequested"],
    },
    uiSchema: {
      type: "VerticalLayout",
      elements: [
        { type: "Control", scope: "#/properties/personnel" },
        { type: "Control", scope: "#/properties/equipment" },
        { type: "Control", scope: "#/properties/indirectCosts" },
        { type: "Control", scope: "#/properties/totalRequested" },
      ],
    },
    createdAt: "2025-02-14T00:00:00Z",
    lastModifiedAt: "2026-05-20T00:00:00Z",
  },

  {
    id: "d0e1f2a3-b4c5-46d7-98e9-f0a1b2c3d4e5",
    name: "Project narrative",
    description: "Free-text description of the proposed work",
    version: "1.2.0",
    instructions: [
      "Describe the need, the proposed activities, and the expected outcomes.",
      "The narrative is limited to 500 words.",
    ].join(" "),
    jsonSchema: {
      $id: "projectNarrative.json",
      type: "object",
      properties: {
        statementOfNeed: { type: "string", maxLength: 4000 },
        proposedActivities: { type: "string", maxLength: 4000 },
        expectedOutcomes: { type: "string", maxLength: 4000 },
      },
      required: ["statementOfNeed", "proposedActivities"],
    },
    uiSchema: {
      type: "VerticalLayout",
      elements: [
        { type: "Control", scope: "#/properties/statementOfNeed" },
        { type: "Control", scope: "#/properties/proposedActivities" },
        { type: "Control", scope: "#/properties/expectedOutcomes" },
      ],
    },
    createdAt: "2025-03-02T00:00:00Z",
    lastModifiedAt: "2026-04-11T00:00:00Z",
  },

  {
    id: "e1f2a3b4-c5d6-47e8-99f0-a1b2c3d4e5f6",
    name: "Organization eligibility",
    description: "Registration and eligibility attestations",
    version: "3.0.0",
    // `instructions` as attached files rather than prose — the model declares
    // `string | File[]`, and without this record the `Fields.File` shape would
    // exist nowhere in the mock for a consumer to see.
    instructions: [
      {
        downloadUrl:
          "https://forms.example.gov/eligibility/sam-registration-guide.pdf",
        name: "sam-registration-guide.pdf",
        description: "How to obtain and renew a SAM.gov registration",
        sizeInBytes: 482133,
        mimeType: "application/pdf",
        createdAt: "2024-11-08T00:00:00Z",
        lastModifiedAt: "2026-01-15T00:00:00Z",
      },
      {
        downloadUrl:
          "https://forms.example.gov/eligibility/applicant-type-matrix.pdf",
        name: "applicant-type-matrix.pdf",
        description: "Which applicant types qualify for each program",
        sizeInBytes: 96411,
        mimeType: "application/pdf",
        createdAt: "2024-11-08T00:00:00Z",
        lastModifiedAt: "2025-09-02T00:00:00Z",
      },
    ],
    jsonSchema: {
      $id: "orgEligibility.json",
      type: "object",
      properties: {
        uei: { type: "string" },
        ein: { type: "string" },
        samRegistrationCurrent: { type: "boolean" },
        applicantType: { type: "string" },
      },
      required: ["uei", "samRegistrationCurrent"],
    },
    uiSchema: {
      type: "VerticalLayout",
      elements: [
        { type: "Control", scope: "#/properties/uei" },
        { type: "Control", scope: "#/properties/ein" },
        { type: "Control", scope: "#/properties/samRegistrationCurrent" },
        { type: "Control", scope: "#/properties/applicantType" },
      ],
    },
    mappingToCommonGrants: {
      uei: { field: "uei" },
      ein: { field: "ein" },
    },
    createdAt: "2024-11-08T00:00:00Z",
    lastModifiedAt: "2026-03-30T00:00:00Z",
  },

  {
    id: "f2a3b4c5-d6e7-48f9-8a01-b2c3d4e5f607",
    name: "Performance measures",
    description: "Proposed outputs and outcomes with target values",
    version: "1.0.1",
    instructions:
      "List at least one output and one outcome measure, each with a numeric target.",
    jsonSchema: {
      $id: "performanceMeasures.json",
      type: "object",
      properties: {
        measures: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              measureType: { type: "string", enum: ["output", "outcome"] },
              target: { type: "number" },
            },
          },
        },
      },
      required: ["measures"],
    },
    uiSchema: {
      type: "VerticalLayout",
      elements: [{ type: "Control", scope: "#/properties/measures" }],
    },
    customFields: {
      reportingCadence: {
        name: "reportingCadence",
        fieldType: "string",
        value: "quarterly",
        description: "How often measures must be reported after award",
      },
    },
    createdAt: "2025-06-19T00:00:00Z",
    lastModifiedAt: "2026-02-02T00:00:00Z",
  },
]);

/** Looks up a form fixture by its exact id. */
export function getFormById(id: string): Form | undefined {
  return FORM_FIXTURES.find((form) => form.id === id);
}

/** Every form fixture, as a mutable copy the handlers can sort and page. */
export function allForms(): Form[] {
  return [...FORM_FIXTURES];
}
