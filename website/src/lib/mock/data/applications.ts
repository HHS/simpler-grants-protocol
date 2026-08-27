/**
 * Hand-written application fixtures, including the nested form responses the
 * `/applications/{appId}/forms/{formId}` routes serve (#3C-2-T1).
 *
 * Applications sit at the deepest point of the reference graph: each one names a
 * competition, the opportunity behind it, and a set of form responses keyed by
 * form. All three are derived from the other fixture modules rather than
 * re-typed — `appFor()` reads the competition, takes its `opportunityId` from
 * the record itself, and builds one response per required form — so an
 * application cannot reference a competition, opportunity, or form that doesn't
 * exist, and cannot claim a response to a form its competition never asked for.
 *
 * **Statuses are chosen to make the submit route demonstrable.** `PUT
 * /applications/{appId}/submit` answers `Responses.ApplicationSubmissionError`
 * when an application has validation errors and 200 when it doesn't (see
 * `handlers/applications.ts`). Both branches need a fixture: the canonical
 * record is submit-ready, and `BLOCKED_APPLICATION_ID` names one that is not.
 * Without that pair, half the route's documented behavior would be unreachable
 * from the playground.
 */

import {
  COMPETITION_FIXTURES,
  getCompetitionById,
  type Competition,
} from "./competitions";
import { CANONICAL_RECORD_ID } from "./ids";
import { CANONICAL_FORM_ID, getFormById } from "./forms";
import type { CustomField } from "./fixtures";

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

/**
 * The id Swagger UI pre-fills into the `appId` box, and therefore the id of the
 * first application record. See `./ids`.
 */
export const CANONICAL_APPLICATION_ID = CANONICAL_RECORD_ID;

/** The id published on the `Models.ApplicationBase` example itself. */
export const DOCUMENTED_APPLICATION_ID = "123e4567-e89b-12d3-a456-426614174000";

/**
 * An application deliberately carrying validation errors, so
 * `PUT /applications/{appId}/submit` has a record that exercises its
 * `ApplicationSubmissionError` branch. Must never be made submit-ready.
 */
export const BLOCKED_APPLICATION_ID = "5f607182-93a4-4b5c-8d6e-7f8091a2b3c4";

/**
 * The id returned by `POST /applications/start`.
 *
 * The mock is stateless (see the module docstring in
 * `handlers/applications.ts`), so starting an application cannot mint and keep a
 * new id — and it must not invent a random one either, since a body that
 * differs per call would break the deterministic-response guarantee the whole
 * fixture set is built on. So `start` echoes a single reserved draft id, every
 * time. It is absent from `APPLICATION_FIXTURES` on purpose: a subsequent
 * `GET /applications/{that id}` answers 404, which is the honest reply from a
 * mock that did not actually create anything.
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
 * Custom fields attached to a form's responses, keyed by form name — the same
 * routing idea as `RESPONSE_BY_FORM_NAME`, so the field suits the form. Only
 * non-empty responses get them: a `notStarted` response with an attachment
 * would claim work that never happened.
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

/** A form response's id, derived from its application and form ids. */
function responseId(index: number): string {
  return `7a8b9c0d-1e2f-40${String(30 + index).padStart(2, "0")}-8a1b-2c3d4e5f60${String(
    70 + index,
  ).padStart(2, "0")}`;
}

/**
 * Builds one `AppFormResponse` for a form the competition requires.
 *
 * The response body is chosen by the form's *name* rather than generated, so it
 * plausibly satisfies that form's `jsonSchema` — a budget form gets numbers, a
 * narrative form gets prose. A form with no canned body gets an empty response
 * and `notStarted`, which is a legitimate state rather than a gap.
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
 * `formResponses` keys are always the competition's own — never a second,
 * hand-maintained copy that could disagree with it.
 *
 * Throws on an unknown competition id, for the same reason `formsFrom` in
 * `./competitions` does: a dangling reference is an authoring bug, and failing
 * at module load surfaces it on the first test run.
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

/**
 * The fixture set: 7 applications spanning every `AppStatus` value, across four
 * competitions, so `POST /applications/search` has something to filter and the
 * status filter visibly narrows results.
 */
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
    // The withdrawn record carries the two FormResponseStatus values no other
    // fixture reaches: its answered form is `custom` (locked on withdrawal),
    // and its budget form was never started at all.
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

/** Looks up an application fixture by its exact id. */
export function getApplicationById(id: string): Application | undefined {
  return APPLICATION_FIXTURES.find((application) => application.id === id);
}

/** Every application fixture, as a mutable copy handlers can sort and page. */
export function allApplications(): Application[] {
  return [...APPLICATION_FIXTURES];
}

/**
 * Finds an application's response to a given form, by form *id* rather than by
 * the `formResponses` key.
 *
 * The routes address a response as `/{appId}/forms/{formId}`, so the id is what
 * a caller has; the key is an internal naming convention of the competition.
 * Looking up by id is also what makes the doubly-pre-filled Execute work: both
 * boxes arrive holding `CANONICAL_RECORD_ID`, and the canonical application's
 * first required form *is* `CANONICAL_FORM_ID`, so the lookup resolves.
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
 * Whether the canonical application answers the canonical form — the invariant
 * that keeps `GET /applications/{appId}/forms/{formId}` working with both
 * parameter boxes left at their pre-filled values.
 *
 * Exported so `__tests__/lib/mock/data/cross-resource.spec.ts` can assert it
 * rather than re-deriving the lookup, and so the reason it matters lives next to
 * the data it constrains.
 */
export function canonicalPrefillResolves(): boolean {
  const application = getApplicationById(CANONICAL_APPLICATION_ID);
  return (
    application !== undefined &&
    getFormResponse(application, CANONICAL_FORM_ID) !== undefined
  );
}
