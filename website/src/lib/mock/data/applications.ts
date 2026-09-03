/**
 * Hand-written application fixtures, including the nested form responses.
 * `appFor()` derives each record from its competition, so references cannot
 * dangle. The canonical record is submit-ready and `BLOCKED_APPLICATION_ID`
 * is not, so both branches of the submit route are reachable.
 */

import {
  COMPETITION_FIXTURES,
  getCompetitionById,
  type Competition,
} from "./competitions";
import { isAtLeastVersion } from "./availability";
import { CANONICAL_RECORD_ID } from "./ids";
import { CANONICAL_FORM_ID, getFormById } from "./forms";
import type { CustomField, Version } from "./fixtures";

/** The status of an application (mirrors `Models.AppStatus`). */
export interface AppStatus {
  value: "inProgress" | "submitted" | "accepted" | "rejected" | "custom";
  customValue?: string;
  description?: string;
}

/** The status of a form response (mirrors `Models.FormResponseStatus`). */
export interface FormResponseStatus {
  value: "notStarted" | "inProgress" | "complete" | "custom";
  customValue?: string;
  description?: string;
}

/** A validation error on an application or form response. */
export interface ValidationError {
  field: string;
  message: string;
}

/** A form response within an application (mirrors `Models.AppFormResponse`). */
export interface AppFormResponse {
  applicationId: string;
  id: string;
  formId: string;
  response: Record<string, unknown>;
  status: FormResponseStatus;
  validationErrors?: ValidationError[];
  customFields?: Record<string, CustomField>;
  createdAt: string;
  lastModifiedAt: string;
}

/** An application in its fullest (`Models.ApplicationBase`) shape. */
export interface Application {
  id: string;
  title: string;
  competitionId: string;
  opportunityId: string;
  formResponses: Record<string, AppFormResponse>;
  status: AppStatus;
  submittedAt?: string | null;
  validationErrors?: ValidationError[];
  customFields?: Record<string, CustomField>;
  createdAt: string;
  lastModifiedAt: string;
}

/** The id Swagger UI pre-fills into the `appId` box (see `./ids`). */
export const CANONICAL_APPLICATION_ID = CANONICAL_RECORD_ID;

/** The id published on the `Models.ApplicationBase` example itself. */
export const DOCUMENTED_APPLICATION_ID = "123e4567-e89b-12d3-a456-426614174000";

/**
 * Deliberately carries validation errors so the submit route can demonstrate
 * its error branch. Must never be made submit-ready.
 */
export const BLOCKED_APPLICATION_ID = "5f607182-93a4-4b5c-8d6e-7f8091a2b3c4";

/**
 * The id the stateless `POST /applications/start` echoes on every call. It is
 * absent from `APPLICATION_FIXTURES` on purpose: the mock creates nothing, so
 * a follow-up GET answers 404.
 */
export const DRAFT_APPLICATION_ID = "9a0b1c2d-3e4f-4051-8617-28394a5b6c7d";

/** Canned responses per form name, so a response body suits its form's schema. */
const RESPONSE_BY_FORM_NAME: Record<string, Record<string, unknown>> = {
  "Applicant details": {
    name: { first: "Jordan", last: "Ellis" },
    email: "jordan.ellis@example.org",
    phone: "555-123-4567",
  },
  "Form A": {
    name: { first: "Jordan", last: "Ellis" },
    email: "jordan.ellis@example.org",
    phone: "555-123-4567",
  },
  "Project budget": {
    personnel: 180000,
    equipment: 45000,
    indirectCosts: 22500,
    totalRequested: 247500,
  },
  "Project narrative": {
    statementOfNeed:
      "Two thirds of households in the service area lack access to affordable broadband.",
    proposedActivities:
      "Complete a feasibility study, design a fixed-wireless network, and secure pole attachments.",
    expectedOutcomes:
      "A construction-ready network design covering 4,200 unserved households.",
  },
  "Organization eligibility": {
    uei: "AB0123456789",
    ein: "123456789",
    samRegistrationCurrent: true,
    applicantType: "non_profit_with_501c3",
  },
  "Performance measures": {
    measures: [
      { name: "Households connected", measureType: "output", target: 4200 },
      {
        name: "Median download speed (Mbps)",
        measureType: "outcome",
        target: 100,
      },
    ],
  },
};

/**
 * Custom fields per form name. Only non-empty responses get them.
 */
const RESPONSE_CUSTOM_FIELDS_BY_FORM_NAME: Record<
  string,
  Record<string, CustomField>
> = {
  "Project budget": {
    budgetSpreadsheet: {
      name: "budgetSpreadsheet",
      fieldType: "object",
      value: {
        downloadUrl: "https://files.example.org/budget.xlsx",
        name: "budget.xlsx",
        description: "The detailed budget behind the summary figures",
        sizeInBytes: 24576,
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        createdAt: "2026-02-10T00:00:00Z",
        lastModifiedAt: "2026-02-10T00:00:00Z",
      },
      description: "Supporting spreadsheet uploaded with this response",
    },
  },
};

/** A stable form-response id, derived from the response's index. */
function responseId(index: number): string {
  return `7a8b9c0d-1e2f-40${String(30 + index).padStart(2, "0")}-8a1b-2c3d4e5f60${String(
    70 + index,
  ).padStart(2, "0")}`;
}

/**
 * Builds one `AppFormResponse`. The body is chosen by form name so it suits
 * the form's schema; a form with no canned body reads `notStarted`. Throws on
 * an unknown form id on purpose: a dangling reference should fail at load.
 */
function formResponse(
  applicationId: string,
  formId: string,
  index: number,
  status: FormResponseStatus,
  createdAt: string,
  lastModifiedAt: string,
  validationErrors?: ValidationError[],
  forceEmpty = false,
): AppFormResponse {
  const form = getFormById(formId);
  if (!form) {
    throw new Error(`Application fixture references unknown form id ${formId}`);
  }
  const response = forceEmpty ? {} : (RESPONSE_BY_FORM_NAME[form.name] ?? {});
  const notStarted = Object.keys(response).length === 0;
  const customFields = notStarted
    ? undefined
    : RESPONSE_CUSTOM_FIELDS_BY_FORM_NAME[form.name];
  return {
    applicationId,
    id: responseId(index),
    formId,
    response,
    status: notStarted
      ? { value: "notStarted", description: "The form has not been started" }
      : status,
    ...(validationErrors === undefined ? {} : { validationErrors }),
    ...(customFields === undefined ? {} : { customFields }),
    createdAt,
    lastModifiedAt,
  };
}

/** Options for `appFor`, mirroring the fields that vary between fixtures. */
interface AppOptions {
  id: string;
  title: string;
  competitionId: string;
  status: AppStatus;
  submittedAt?: string | null;
  validationErrors?: ValidationError[];
  responseStatus?: FormResponseStatus;
  /** Applied to the response for the competition's first required form. */
  responseValidationErrors?: ValidationError[];
  /** Form keys whose responses are left empty, so they read `notStarted`. */
  notStartedKeys?: string[];
  createdAt: string;
  lastModifiedAt: string;
  customFields?: Record<string, CustomField>;
}

/**
 * Assembles an application from its competition, so `opportunityId` and the
 * `formResponses` keys always match it. Throws on an unknown competition id
 * on purpose: a dangling reference should fail at load.
 */
function appFor(options: AppOptions): Application {
  const competition: Competition | undefined = getCompetitionById(
    options.competitionId,
  );
  if (!competition) {
    throw new Error(
      `Application fixture references unknown competition id ${options.competitionId}`,
    );
  }

  const requiredKeys = competition.forms.validation?.required ?? [];
  const keys =
    requiredKeys.length > 0
      ? requiredKeys
      : Object.keys(competition.forms.forms);

  const formResponses: Record<string, AppFormResponse> = {};
  keys.forEach((key, index) => {
    const form = competition.forms.forms[key];
    formResponses[key] = formResponse(
      options.id,
      form.id,
      index,
      options.responseStatus ?? {
        value: "complete",
        description: "The form response is complete",
      },
      options.createdAt,
      options.lastModifiedAt,
      index === 0 ? options.responseValidationErrors : undefined,
      options.notStartedKeys?.includes(key) ?? false,
    );
  });

  return {
    id: options.id,
    title: options.title,
    competitionId: competition.id,
    opportunityId: competition.opportunityId,
    formResponses,
    status: options.status,
    submittedAt: options.submittedAt ?? null,
    ...(options.validationErrors === undefined
      ? {}
      : { validationErrors: options.validationErrors }),
    ...(options.customFields === undefined
      ? {}
      : { customFields: options.customFields }),
    createdAt: options.createdAt,
    lastModifiedAt: options.lastModifiedAt,
  };
}

/** The fixture set: 7 applications spanning every `AppStatus` value. */
export const APPLICATION_FIXTURES: readonly Application[] = Object.freeze<
  Application[]
>([
  // ---- The canonical, submit-ready record (see CANONICAL_APPLICATION_ID) ----
  appFor({
    id: CANONICAL_APPLICATION_ID,
    title: "Riverside CHC — small business grant application",
    competitionId: COMPETITION_FIXTURES[0].id,
    status: {
      value: "inProgress",
      description: "The application is in progress.",
    },
    createdAt: "2026-02-10T00:00:00Z",
    lastModifiedAt: "2026-06-22T00:00:00Z",
  }),

  // ---- The id published on the ApplicationBase example ----
  appFor({
    id: DOCUMENTED_APPLICATION_ID,
    title: "My Application",
    competitionId: COMPETITION_FIXTURES[1].id,
    status: {
      value: "inProgress",
      description: "The application is in progress.",
    },
    createdAt: "2021-01-01T00:00:00Z",
    lastModifiedAt: "2021-01-01T00:00:00Z",
  }),

  // ---- The blocked record: exercises the submission-error branch ----
  appFor({
    id: BLOCKED_APPLICATION_ID,
    title: "Cascade Workforce — clean energy demonstration (incomplete)",
    competitionId: COMPETITION_FIXTURES[3].id,
    status: {
      value: "inProgress",
      description: "The application is in progress.",
    },
    validationErrors: [
      {
        field: "formResponses.projectBudget.indirectCosts",
        message: "Indirect costs may not exceed 10% of the total requested",
      },
      {
        field: "formResponses.performanceMeasures",
        message: "At least one outcome measure is required",
      },
    ],
    responseValidationErrors: [
      { field: "email", message: "A work email address is required" },
    ],
    responseStatus: {
      value: "inProgress",
      description: "The form response is in progress",
    },
    createdAt: "2026-04-01T00:00:00Z",
    lastModifiedAt: "2026-06-25T00:00:00Z",
  }),

  appFor({
    id: "6071829a-a4b5-4c6d-8e7f-8091a2b3c4d5",
    title: "Prairie Broadband — rural broadband planning grant",
    competitionId: COMPETITION_FIXTURES[2].id,
    status: {
      value: "submitted",
      description: "The application has been submitted.",
    },
    submittedAt: "2025-07-14T16:20:00Z",
    createdAt: "2025-05-02T00:00:00Z",
    lastModifiedAt: "2025-07-14T16:20:00Z",
  }),

  appFor({
    id: "718293ab-b5c6-4d7e-8f80-91a2b3c4d5e6",
    title: "Coastal Research Institute — clean energy demonstration",
    competitionId: COMPETITION_FIXTURES[3].id,
    status: {
      value: "accepted",
      description: "The application was accepted for funding.",
    },
    submittedAt: "2026-05-30T12:00:00Z",
    createdAt: "2026-03-15T00:00:00Z",
    lastModifiedAt: "2026-06-18T00:00:00Z",
    customFields: {
      reviewScore: {
        name: "reviewScore",
        fieldType: "number",
        value: 92,
        description: "Panel score out of 100",
      },
    },
  }),

  appFor({
    id: "8293abbc-c6d7-4e8f-8091-a2b3c4d5e6f7",
    title: "Lakeside Arts Collective — clean energy demonstration",
    competitionId: COMPETITION_FIXTURES[3].id,
    status: {
      value: "rejected",
      description: "The application was not selected for funding.",
    },
    submittedAt: "2026-05-28T09:45:00Z",
    createdAt: "2026-03-20T00:00:00Z",
    lastModifiedAt: "2026-06-19T00:00:00Z",
    customFields: {
      reviewScore: {
        name: "reviewScore",
        fieldType: "number",
        value: 61,
        description: "Panel score out of 100",
      },
    },
  }),

  appFor({
    id: "93abbccd-d7e8-4f80-91a2-b3c4d5e6f708",
    title: "Example Organization — rural health clinic modernization",
    competitionId: COMPETITION_FIXTURES[5].id,
    status: {
      value: "custom",
      customValue: "withdrawn",
      description: "The applicant withdrew the application before review.",
    },
    // Covers the two FormResponseStatus values no other fixture reaches:
    // `custom` (locked) and `notStarted`.
    responseStatus: {
      value: "custom",
      customValue: "locked",
      description:
        "Responses are locked because the application was withdrawn.",
    },
    notStartedKeys: ["projectBudget"],
    createdAt: "2026-03-01T00:00:00Z",
    lastModifiedAt: "2026-04-14T00:00:00Z",
  }),
]);

/**
 * First version carrying `opportunityId` (`@added(v0_3)` in
 * `lib/core/lib/core/models/application.tsp`).
 */
const OPPORTUNITY_ID_MIN_VERSION: Version = "0.3.0";

/**
 * First version calling the title field `title`; before it the same field is
 * `name` (`@renamedFrom(v0_4, "name")` on `Models.AppRef`).
 */
const TITLE_RENAMED_VERSION: Version = "0.4.0";

/**
 * An application as a given version puts it on the wire: `title` is `name`
 * before v0.4, and `opportunityId` is absent before v0.3.
 */
export type WireApplication = Omit<Application, "title" | "opportunityId"> & {
  title?: string;
  name?: string;
  opportunityId?: string;
};

/** Renames one key in place, keeping its position in the key order. */
function renameKey(
  source: Record<string, unknown>,
  from: string,
  to: string,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [
      key === from ? to : key,
      value,
    ]),
  );
}

/**
 * Projects a fixture onto the shape a version documents. Without this the
 * playground answers `title` at v0.2/v0.3 while the docs pane beside it shows
 * `name`, which is the mismatch the mock exists to avoid.
 *
 * The conformance suite cannot catch a drift here: the versioned JSON Schema
 * generator applies `@added`/`@removed` but not `@renamedFrom`, so every
 * version's `ApplicationBase.yaml` still says `title`. The per-version wire
 * contract lives in the OpenAPI documents, which is what these tests assert
 * against.
 */
export function shapeApplicationForVersion(
  application: Application,
  version: Version,
): WireApplication {
  let shaped: Record<string, unknown> = { ...application };

  if (!isAtLeastVersion(version, OPPORTUNITY_ID_MIN_VERSION)) {
    delete shaped.opportunityId;
  }
  if (!isAtLeastVersion(version, TITLE_RENAMED_VERSION)) {
    shaped = renameKey(shaped, "title", "name");
  }

  return shaped as WireApplication;
}

/** Looks up an application fixture by its exact id. */
export function getApplicationById(id: string): Application | undefined {
  return APPLICATION_FIXTURES.find((application) => application.id === id);
}

/** Every application fixture, as a mutable copy handlers can sort and page. */
export function allApplications(): Application[] {
  return [...APPLICATION_FIXTURES];
}

/**
 * Finds a response by form id (what the route carries), not by the
 * `formResponses` key.
 */
export function getFormResponse(
  application: Application,
  formId: string,
): AppFormResponse | undefined {
  return Object.values(application.formResponses).find(
    (response) => response.formId === formId,
  );
}

/**
 * The canonical application must answer the canonical form, or the doubly
 * pre-filled `GET /applications/{appId}/forms/{formId}` answers 404.
 * Exported so the cross-resource spec can assert it.
 */
export function canonicalPrefillResolves(): boolean {
  const application = getApplicationById(CANONICAL_APPLICATION_ID);
  return (
    application !== undefined &&
    getFormResponse(application, CANONICAL_FORM_ID) !== undefined
  );
}
