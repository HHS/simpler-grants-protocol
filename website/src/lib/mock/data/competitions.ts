/**
 * Hand-written competition fixtures for `GET /competitions/{compId}`.
 * Each record's opportunity and forms come from the other fixture modules, so
 * references cannot dangle. This `Competition` type is deliberately separate
 * from the trimmed one in `./fixtures`, which models the nested previews on
 * `OpportunityDetails` and omits the required `forms` object.
 */

import { OPPORTUNITY_FIXTURES, type CustomField } from "./fixtures";
import {
  FORM_FIXTURES,
  getFormById,
  type FileAttachment,
  type Form,
} from "./forms";
import { CANONICAL_RECORD_ID, DOCUMENTED_EXAMPLE_ID } from "./ids";
import type {
  ApplicantType,
  CompetitionStatus,
  CompetitionTimeline,
  SingleDateEvent,
} from "./fixtures";

/**
 * Which forms a competition requires (mirrors `Models.CompetitionForms`).
 * `validation.required` names keys of `forms`, not form ids.
 */
export interface CompetitionForms {
  forms: Record<string, Form>;
  validation?: { required?: string[] };
}

/** A competition in its fullest (`Models.CompetitionBase`) shape. */
export interface Competition {
  id: string;
  opportunityId: string;
  title: string;
  description?: string;
  /** Prose or attached documents; the model allows either. */
  instructions?: string | FileAttachment[];
  status: CompetitionStatus;
  keyDates?: CompetitionTimeline;
  forms: CompetitionForms;
  acceptedApplicantTypes?: ApplicantType[];
  customFields?: Record<string, CustomField>;
  createdAt: string;
  lastModifiedAt: string;
}

/** The id Swagger UI pre-fills into the `compId` box (see `./ids`). */
export const CANONICAL_COMPETITION_ID = CANONICAL_RECORD_ID;

/** The id published on the `Models.CompetitionBase` example itself. */
export const DOCUMENTED_COMPETITION_ID = DOCUMENTED_EXAMPLE_ID;

/** Builds a single-date competition event. */
function dateEvent(name: string, date: string): SingleDateEvent {
  return { name, eventType: "singleDate", date };
}

/**
 * Builds a `CompetitionForms` from form ids, embedding the live fixture
 * records. Throws on an unknown id on purpose: a dangling reference should
 * fail at module load.
 */
function formsFrom(
  entries: Record<string, string>,
  required: string[],
): CompetitionForms {
  const forms: Record<string, Form> = {};
  for (const [key, formId] of Object.entries(entries)) {
    const form = getFormById(formId);
    if (!form) {
      throw new Error(
        `Competition fixture references unknown form id ${formId} (key "${key}")`,
      );
    }
    forms[key] = form;
  }
  return { forms, validation: { required } };
}

/** Form ids referenced below, named for readability at the call sites. */
const APPLICANT_DETAILS = FORM_FIXTURES[0].id;
const FORM_A = FORM_FIXTURES[1].id;
const PROJECT_BUDGET = FORM_FIXTURES[2].id;
const PROJECT_NARRATIVE = FORM_FIXTURES[3].id;
const ORG_ELIGIBILITY = FORM_FIXTURES[4].id;
const PERFORMANCE_MEASURES = FORM_FIXTURES[5].id;

/**
 * The fixture set: 6 competitions across 6 opportunities, spanning all three
 * `CompetitionStatus` values.
 */
export const COMPETITION_FIXTURES: readonly Competition[] = Object.freeze<
  Competition[]
>([
  // ---- The canonical record (see CANONICAL_COMPETITION_ID) ----
  {
    id: CANONICAL_COMPETITION_ID,
    opportunityId: OPPORTUNITY_FIXTURES[0].id,
    title: "Small business grant program — 2026 cycle",
    description:
      "The 2026 application cycle for the small business grant program.",
    instructions:
      "Complete all four required forms. Applications are reviewed in the order they are submitted.",
    status: {
      value: "open",
      description: "Competition is open for applications",
    },
    keyDates: {
      openDate: dateEvent("Open Date", "2026-01-15"),
      closeDate: dateEvent("Close Date", "2026-09-30"),
      otherDates: {
        reviewPeriod: {
          name: "Application Review Period",
          eventType: "dateRange",
          startDate: "2026-10-01",
          endDate: "2026-11-30",
          description: "Panel review of submitted applications",
        },
      },
    },
    forms: formsFrom(
      {
        applicantDetails: APPLICANT_DETAILS,
        orgEligibility: ORG_ELIGIBILITY,
        projectBudget: PROJECT_BUDGET,
        projectNarrative: PROJECT_NARRATIVE,
      },
      ["applicantDetails", "orgEligibility", "projectBudget"],
    ),
    acceptedApplicantTypes: [
      {
        value: "for_profit_small_business",
        description: "Small businesses as defined by the SBA",
      },
      { value: "individual", description: "Sole proprietors" },
    ],
    createdAt: "2025-11-01T00:00:00Z",
    lastModifiedAt: "2026-06-15T00:00:00Z",
  },

  // ---- The id published on the CompetitionBase example ----
  {
    id: DOCUMENTED_COMPETITION_ID,
    opportunityId: OPPORTUNITY_FIXTURES[1].id,
    title: "Competition 1",
    description: "Competition 1 description",
    instructions: "Competition 1 instructions",
    status: {
      value: "open",
      description: "Competition is open for applications",
    },
    keyDates: {
      openDate: dateEvent("Open Date", "2025-01-01"),
      closeDate: dateEvent("Close Date", "2025-01-30"),
      otherDates: {
        reviewPeriod: {
          name: "Application Review Period",
          eventType: "dateRange",
          startDate: "2025-02-01",
          endDate: "2025-02-28",
        },
      },
    },
    forms: formsFrom({ formA: FORM_A, formB: APPLICANT_DETAILS }, [
      "formA",
      "formB",
    ]),
    createdAt: "2025-01-01T00:00:00Z",
    lastModifiedAt: "2025-01-01T00:00:00Z",
  },

  {
    id: "a4b5c6d7-e8f9-4a0b-8c1d-2e3f4a5b6c7d",
    opportunityId: OPPORTUNITY_FIXTURES[4].id,
    title: "Rural Broadband Expansion — planning grants",
    description:
      "Planning-grant track for rural broadband feasibility studies and network design.",
    // The one record showing the `File[]` variant of `instructions` here.
    instructions: [
      {
        downloadUrl:
          "https://grants.example.gov/broadband/planning-track-guidelines.pdf",
        name: "planning-track-guidelines.pdf",
        description: "Full guidelines for the planning-grant track",
        sizeInBytes: 731204,
        mimeType: "application/pdf",
        createdAt: "2025-02-20T00:00:00Z",
        lastModifiedAt: "2025-03-14T00:00:00Z",
      },
    ],
    status: {
      value: "closed",
      description: "Competition closed to new applications",
    },
    keyDates: {
      openDate: dateEvent("Open Date", "2025-04-01"),
      closeDate: dateEvent("Close Date", "2025-07-15"),
    },
    forms: formsFrom({ applicantDetails: APPLICANT_DETAILS }, [
      "applicantDetails",
    ]),
    acceptedApplicantTypes: [
      {
        value: "government_county",
        description: "County governments",
      },
      {
        value: "government_municipal",
        description: "Municipal governments and townships",
      },
    ],
    createdAt: "2025-02-20T00:00:00Z",
    lastModifiedAt: "2025-07-16T00:00:00Z",
  },

  {
    id: "b5c6d7e8-f9a0-4b1c-8d2e-3f4a5b6c7d8e",
    opportunityId: OPPORTUNITY_FIXTURES[7].id,
    title: "Clean Energy Innovation — demonstration projects",
    description:
      "For applicants ready to demonstrate a technology at pilot scale.",
    instructions:
      "Performance measures are required for this track and are scored.",
    status: {
      value: "open",
      description: "Competition is open for applications",
    },
    keyDates: {
      openDate: dateEvent("Open Date", "2026-03-01"),
      closeDate: dateEvent("Close Date", "2026-12-01"),
    },
    forms: formsFrom(
      {
        applicantDetails: APPLICANT_DETAILS,
        projectBudget: PROJECT_BUDGET,
        projectNarrative: PROJECT_NARRATIVE,
        performanceMeasures: PERFORMANCE_MEASURES,
        orgEligibility: ORG_ELIGIBILITY,
      },
      [
        "applicantDetails",
        "projectBudget",
        "projectNarrative",
        "performanceMeasures",
      ],
    ),
    customFields: {
      reviewPanel: {
        name: "reviewPanel",
        fieldType: "string",
        value: "Technical Merit Panel B",
        description: "The panel that scores this track",
      },
    },
    createdAt: "2026-01-10T00:00:00Z",
    lastModifiedAt: "2026-06-20T00:00:00Z",
  },

  {
    id: "c6d7e8f9-a0b1-4c2d-8e3f-4a5b6c7d8e9f",
    opportunityId: OPPORTUNITY_FIXTURES[9].id,
    title: "Community Health Outreach — continuation awards",
    description:
      "Continuation track, open only to current grantees in good standing.",
    status: {
      value: "custom",
      customValue: "invitationOnly",
      description: "Open only to invited current grantees",
    },
    keyDates: {
      openDate: dateEvent("Open Date", "2026-05-01"),
      closeDate: dateEvent("Close Date", "2026-08-31"),
    },
    forms: formsFrom(
      {
        applicantDetails: APPLICANT_DETAILS,
        performanceMeasures: PERFORMANCE_MEASURES,
      },
      ["applicantDetails", "performanceMeasures"],
    ),
    createdAt: "2026-02-01T00:00:00Z",
    lastModifiedAt: "2026-05-05T00:00:00Z",
  },

  {
    id: "d7e8f9a0-b1c2-4d3e-8f4a-5b6c7d8e9f01",
    opportunityId: OPPORTUNITY_FIXTURES[12].id,
    title: "Rural Health Clinic Modernization — equipment track",
    description: "Equipment-only track with a simplified budget form.",
    status: {
      value: "open",
      description: "Competition is open for applications",
    },
    keyDates: {
      openDate: dateEvent("Open Date", "2026-02-15"),
      closeDate: dateEvent("Close Date", "2026-10-15"),
    },
    forms: formsFrom(
      { applicantDetails: APPLICANT_DETAILS, projectBudget: PROJECT_BUDGET },
      ["applicantDetails", "projectBudget"],
    ),
    acceptedApplicantTypes: [
      {
        // `ApplicantTypeOptions` really spells this `non_profit_with_501c3`
        // (its sibling is `nonprofit_without_501c3`); not a typo here.
        value: "non_profit_with_501c3",
        description: "Nonprofits with 501(c)(3) status",
      },
      {
        value: "custom",
        customValue: "critical_access_hospital",
        description: "Federally designated critical access hospitals",
      },
    ],
    createdAt: "2025-12-05T00:00:00Z",
    lastModifiedAt: "2026-04-28T00:00:00Z",
  },
]);

/** Looks up a competition fixture by its exact id. */
export function getCompetitionById(id: string): Competition | undefined {
  return COMPETITION_FIXTURES.find((competition) => competition.id === id);
}
