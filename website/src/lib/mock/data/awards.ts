/**
 * Hand-written award fixtures for the `/awards` endpoints. Every reference is
 * built from the other fixture modules, so none can dangle. The canonical
 * record mirrors the documented `AwardBase` example, except its references,
 * which derive from live fixture records on purpose: the example's own ids
 * exist only inside the example. Awards are v0.4-only, so this module has no
 * version shaping.
 */

import { OPPORTUNITY_FIXTURES, type Money } from "./fixtures";
import { APPLICATION_FIXTURES, type Application } from "./applications";
import { CANONICAL_RECORD_ID } from "./ids";
import {
  orgRefCollection,
  type Identifier,
  type OrgRefCollection,
} from "./organizations";
import type { CustomField, DateRangeEvent, SingleDateEvent } from "./fixtures";

/** The lifecycle status of an award (mirrors `Models.AwdStatus`). */
export interface AwdStatus {
  value: "awarded" | "completed" | "cancelled" | "custom";
  customValue?: string;
  description?: string;
}

/** Requested, awarded, and disbursed amounts (mirrors `Models.AwdFunding`). */
export interface AwdFunding {
  details?: string;
  requestedAmount?: Money;
  awardedAmount?: Money;
  disbursedAmount?: Money;
}

/** Award date and period of performance (mirrors `Models.AwdTimeline`). */
export interface AwdTimeline {
  awardDate?: SingleDateEvent;
  periodOfPerformance?: DateRangeEvent;
  otherDates?: Record<string, SingleDateEvent | DateRangeEvent>;
}

/**
 * Identifiers for an award (mirrors `Models.AwdIds`). `awd:us:fain` is a base
 * identifier with its own top-level key, never filed under `otherIds`, which
 * is only for registries the protocol does not define on the model.
 */
export interface AwdIds {
  systemId?: Identifier;
  "awd:us:fain"?: Identifier;
  otherIds?: Record<string, Identifier>;
}

/** A person's name (mirrors `Fields.Name`). */
export interface PersonName {
  prefix?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
}

/** An individual award recipient (mirrors `Models.AwdRecipientIndividual`). */
export interface AwdRecipientIndividual {
  name?: PersonName;
  identifiers?: {
    systemId?: Identifier;
    otherIds?: Record<string, Identifier>;
  };
  customFields?: Record<string, CustomField>;
}

/** A reference to an opportunity (mirrors `Models.OppRef`). */
export interface OppRef {
  id: string;
  title: string;
}

/** A reference to an application (mirrors `Models.AppRef`). */
export interface AppRef {
  id: string;
  title: string;
}

/** A reference to an award (mirrors `Models.AwdRef`). */
export interface AwdRef {
  id: string;
  title: string;
  identifiers?: AwdIds;
}

/** An award in its fullest (`Models.AwardBase`) shape. */
export interface Award {
  id: string;
  title: string;
  identifiers?: AwdIds;
  description: string;
  status: AwdStatus;
  funding?: AwdFunding;
  keyDates?: AwdTimeline;
  opportunity?: OppRef;
  application?: AppRef;
  funders?: OrgRefCollection;
  recipientOrganizations?: OrgRefCollection;
  recipientIndividual?: AwdRecipientIndividual;
  parent?: AwdRef;
  source?: string;
  customFields?: Record<string, CustomField>;
  createdAt: string;
  lastModifiedAt: string;
}

/** The id Swagger UI pre-fills into the `awdId` box (see `./ids`). */
export const CANONICAL_AWARD_ID = CANONICAL_RECORD_ID;

/** The id published on the `Models.AwardBase` example itself. */
export const DOCUMENTED_AWARD_ID = "01912a8b-7c3d-7894-abcd-ef1234567890";

/** Organization ids referenced below, named for readability at the call sites. */
const HRSA = "018f2e77-4b5c-7d2e-9f3a-bcdef1234567";
const NSF = "018f2e77-5c6d-7e3f-8a4b-cdef12345678";
const RIVERSIDE_CHC = "083b4567-e89d-42c8-a439-6c1234567890";
const CASCADE_WORKFORCE = "018f2e77-6d7e-7f4a-9b5c-def123456789";
const LAKESIDE_ARTS = "018f2e77-7e8f-7a5b-8c6d-ef1234567890";
const PRAIRIE_BROADBAND = "018f2e77-8f90-7b6c-8d7e-f12345678901";
const COASTAL_RESEARCH = "018f2e77-9012-7c7d-8e8f-123456789012";
const EXAMPLE_ORG = CANONICAL_RECORD_ID;

/** Builds a `Money` amount in USD. */
function usd(amount: string): Money {
  return { amount, currency: "USD" };
}

/** Builds a single-date award event. */
function awardedOn(date: string): SingleDateEvent {
  return {
    name: "Award date",
    eventType: "singleDate",
    date,
    description: "The date the award was issued.",
  };
}

/** Builds a period-of-performance date range. */
function performedOver(startDate: string, endDate: string): DateRangeEvent {
  return {
    name: "Period of performance",
    eventType: "dateRange",
    startDate,
    endDate,
    description: "The period during which the funded work is performed.",
  };
}

/** Builds a FAIN identifier collection, FAIN on its base (top-level) key. */
function fain(value: string, systemId: string): AwdIds {
  return {
    systemId: { registry: { code: "awd:grants.gov:system" }, id: systemId },
    "awd:us:fain": {
      registry: {
        code: "awd:us:fain",
        url: "https://commongrants.org/registries/awd-us-fain",
      },
      id: value,
    },
  };
}

/** Builds an `OppRef` from an opportunity index, reading the real record. */
function oppRefFor(index: number): OppRef {
  const opportunity = OPPORTUNITY_FIXTURES[index];
  if (!opportunity) {
    throw new Error(`Award fixture references opportunity index ${index}`);
  }
  return { id: opportunity.id, title: opportunity.title };
}

/** Builds an `AppRef` from an application index, reading its real title. */
function appRefFor(index: number): AppRef {
  const application: Application | undefined = APPLICATION_FIXTURES[index];
  if (!application) {
    throw new Error(`Award fixture references application index ${index}`);
  }
  return { id: application.id, title: application.title };
}

/**
 * The fixture set: 11 awards spanning all four `AwdStatus` values. The
 * canonical record must carry the newest `lastModifiedAt` so it sorts first
 * under the list endpoint's default ordering.
 */
export const AWARD_FIXTURES: readonly Award[] = Object.freeze<Award[]>([
  // ---- The canonical record: the spec's documented AwardBase example ----
  {
    id: CANONICAL_AWARD_ID,
    title: "Community Health Center Capital Improvement Grant",
    identifiers: fain("H80CS00001", "01912a8b-7c3d-7894-abcd-ef1234567890"),
    description:
      "Supports facility upgrades at federally qualified health centers.",
    status: {
      value: "awarded",
      description: "Award has been issued and funds are being disbursed.",
    },
    // Verbatim from the spec's `AwardBase` example. It exceeds opportunity 0's
    // `maxAwardAmount` because the example was written against an opportunity
    // of its own; opportunity 0 is byte-pinned by the golden corpus and cannot
    // be widened to suit it. Every other award stays within its cap.
    funding: {
      requestedAmount: usd("500000.00"),
      awardedAmount: usd("450000.00"),
      disbursedAmount: usd("150000.00"),
    },
    keyDates: {
      awardDate: awardedOn("2026-03-01"),
      periodOfPerformance: performedOver("2026-04-01", "2027-03-31"),
    },
    opportunity: oppRefFor(0),
    application: appRefFor(0),
    funders: orgRefCollection(HRSA),
    recipientOrganizations: orgRefCollection(RIVERSIDE_CHC),
    source: "https://www.usaspending.gov/award/ASST_NON_H80CS00001",
    createdAt: "2026-03-01T00:00:00Z",
    // Must stay the newest in the set so this record leads `GET /awards`
    // under the default ordering — a test pins it. The spec's own example
    // says 2026-06-01, which would sort this record into the middle.
    lastModifiedAt: "2026-11-01T00:00:00Z",
  },

  // ---- The id published on the AwardBase example ----
  {
    id: DOCUMENTED_AWARD_ID,
    title: "Rural Health Clinic Modernization Award",
    identifiers: fain("H80CS00002", "01912a8b-7c3d-7894-abcd-ef1234567891"),
    description:
      "Funds diagnostic equipment replacement at three critical access hospitals.",
    status: {
      value: "awarded",
      description: "Award has been issued and funds are being disbursed.",
    },
    funding: {
      requestedAmount: usd("310000.00"),
      awardedAmount: usd("295000.00"),
      disbursedAmount: usd("73750.00"),
    },
    keyDates: {
      awardDate: awardedOn("2026-05-15"),
      periodOfPerformance: performedOver("2026-06-01", "2028-05-31"),
    },
    opportunity: oppRefFor(12),
    funders: orgRefCollection(HRSA),
    recipientOrganizations: orgRefCollection(RIVERSIDE_CHC, {
      subrecipient: EXAMPLE_ORG,
    }),
    source: "https://www.usaspending.gov/award/ASST_NON_H80CS00002",
    createdAt: "2026-05-15T00:00:00Z",
    lastModifiedAt: "2026-06-28T00:00:00Z",
  },

  {
    id: "aa1b2c3d-4e5f-4061-8a7b-8c9d0e1f2032",
    title: "Clean Energy Innovation Demonstration Award",
    identifiers: fain("DE0000101", "01912a8b-7c3d-7894-abcd-ef1234567892"),
    description:
      "Supports a pilot-scale demonstration of a long-duration storage system.",
    status: {
      value: "awarded",
      description: "Award has been issued and funds are being disbursed.",
    },
    funding: {
      details: "Awarded in two tranches, contingent on year-one milestones.",
      requestedAmount: usd("520000.00"),
      awardedAmount: usd("480000.00"),
      disbursedAmount: usd("240000.00"),
    },
    keyDates: {
      awardDate: awardedOn("2026-06-10"),
      periodOfPerformance: performedOver("2026-07-01", "2029-06-30"),
      otherDates: {
        yearOneReport: {
          name: "Year one progress report",
          eventType: "singleDate",
          date: "2027-07-31",
          description: "Milestone report gating the second tranche",
        },
      },
    },
    opportunity: oppRefFor(7),
    application: appRefFor(4),
    funders: orgRefCollection(NSF),
    recipientOrganizations: orgRefCollection(COASTAL_RESEARCH),
    createdAt: "2026-06-10T00:00:00Z",
    lastModifiedAt: "2026-06-25T00:00:00Z",
  },

  {
    id: "bb2c3d4e-5f60-4172-8b8c-9d0e1f203143",
    title: "Rural Broadband Expansion Planning Award",
    identifiers: fain("RUS0000045", "01912a8b-7c3d-7894-abcd-ef1234567893"),
    description:
      "Funds a feasibility study and network design for four rural counties.",
    status: {
      value: "completed",
      description: "The award's period of performance has ended.",
    },
    funding: {
      requestedAmount: usd("180000.00"),
      awardedAmount: usd("175000.00"),
      disbursedAmount: usd("175000.00"),
    },
    keyDates: {
      awardDate: awardedOn("2025-09-01"),
      periodOfPerformance: performedOver("2025-10-01", "2026-09-30"),
    },
    opportunity: oppRefFor(4),
    application: appRefFor(3),
    funders: orgRefCollection(HRSA),
    recipientOrganizations: orgRefCollection(PRAIRIE_BROADBAND),
    createdAt: "2025-09-01T00:00:00Z",
    lastModifiedAt: "2026-10-05T00:00:00Z",
  },

  {
    id: "cc3d4e5f-6071-4283-8c9d-0e1f20314254",
    title: "Workforce Apprenticeship Program Award",
    identifiers: {
      ...fain("ETA0000318", "01912a8b-7c3d-7894-abcd-ef1234567894"),
      // A registry the protocol does not define on the model, so it belongs
      // under `otherIds`.
      otherIds: {
        "awd:usaspending:generated": {
          registry: { code: "awd:usaspending:generated" },
          id: "ASST_NON_ETA0000318",
        },
      },
    },
    description:
      "Supports 120 building-trades apprenticeships across three counties.",
    status: {
      value: "completed",
      description: "The award's period of performance has ended.",
    },
    funding: {
      requestedAmount: usd("125000.00"),
      awardedAmount: usd("115000.00"),
      disbursedAmount: usd("115000.00"),
    },
    keyDates: {
      // Opportunity 8 closed 2025-02-28, so the award cannot predate that.
      awardDate: awardedOn("2025-04-15"),
      periodOfPerformance: performedOver("2025-06-01", "2026-03-31"),
    },
    opportunity: oppRefFor(8),
    funders: orgRefCollection(HRSA, { passThrough: NSF }),
    recipientOrganizations: orgRefCollection(CASCADE_WORKFORCE),
    createdAt: "2025-04-15T00:00:00Z",
    lastModifiedAt: "2026-04-10T00:00:00Z",
  },

  {
    id: "dd4e5f60-7182-4394-8d0e-1f2031425365",
    title: "Clean Energy Innovation Demonstration Award — Amendment 1",
    identifiers: fain("DE0000101-A1", "01912a8b-7c3d-7894-abcd-ef1234567895"),
    description:
      "Adds scope for grid-interconnection studies to the base demonstration award.",
    status: {
      value: "awarded",
      description: "Award has been issued and funds are being disbursed.",
    },
    funding: {
      requestedAmount: usd("300000.00"),
      awardedAmount: usd("275000.00"),
      disbursedAmount: usd("0.00"),
    },
    keyDates: {
      awardDate: awardedOn("2026-06-20"),
      periodOfPerformance: performedOver("2026-07-01", "2029-06-30"),
    },
    opportunity: oppRefFor(7),
    funders: orgRefCollection(NSF),
    recipientOrganizations: orgRefCollection(COASTAL_RESEARCH),
    // The parent is the base award above; title and identifiers must match it.
    parent: {
      id: "aa1b2c3d-4e5f-4061-8a7b-8c9d0e1f2032",
      title: "Clean Energy Innovation Demonstration Award",
      identifiers: fain("DE0000101", "01912a8b-7c3d-7894-abcd-ef1234567892"),
    },
    createdAt: "2026-06-20T00:00:00Z",
    lastModifiedAt: "2026-06-21T00:00:00Z",
  },

  {
    id: "ee5f6071-8293-44a5-8e1f-2031425364a5",
    title: "Arts & Culture Preservation Award",
    identifiers: fain("NEA0000772", "01912a8b-7c3d-7894-abcd-ef1234567896"),
    description:
      "Supports the cataloguing and digitization of a regional folk-arts archive.",
    status: {
      value: "cancelled",
      description: "The award was terminated at the recipient's request.",
    },
    funding: {
      requestedAmount: usd("32000.00"),
      awardedAmount: usd("28000.00"),
      disbursedAmount: usd("12000.00"),
    },
    keyDates: {
      awardDate: awardedOn("2025-11-01"),
      periodOfPerformance: performedOver("2026-01-01", "2026-12-31"),
    },
    // No `application` reference: the fixtures hold no application to the
    // Arts & Culture opportunity, and an award must not point at an
    // application submitted to a different opportunity.
    opportunity: oppRefFor(10),
    funders: orgRefCollection(NSF),
    recipientOrganizations: orgRefCollection(LAKESIDE_ARTS),
    createdAt: "2025-11-01T00:00:00Z",
    lastModifiedAt: "2026-02-18T00:00:00Z",
  },

  {
    id: "ff607182-93a4-45b6-8f20-31425364a5b6",
    title: "Coastal Resilience Planning Award",
    identifiers: fain("NOAA0000914", "01912a8b-7c3d-7894-abcd-ef1234567897"),
    description:
      "Funds shoreline vulnerability mapping for twelve coastal municipalities.",
    status: {
      value: "cancelled",
      description:
        "The award was cancelled after the recipient declined the terms.",
    },
    funding: {
      requestedAmount: usd("78000.00"),
      awardedAmount: usd("70000.00"),
      disbursedAmount: usd("0.00"),
    },
    keyDates: { awardDate: awardedOn("2025-06-15") },
    opportunity: oppRefFor(6),
    funders: orgRefCollection(NSF),
    recipientOrganizations: orgRefCollection(COASTAL_RESEARCH),
    createdAt: "2025-06-15T00:00:00Z",
    lastModifiedAt: "2025-08-02T00:00:00Z",
  },

  {
    id: "01718293-a4b5-46c7-9031-425364a5b6c7",
    title: "Community Health Outreach Continuation Award",
    identifiers: fain("H80CS00003", "01912a8b-7c3d-7894-abcd-ef1234567898"),
    description:
      "Continuation funding for mobile health outreach in three rural counties.",
    status: {
      value: "custom",
      customValue: "suspended",
      description: "Disbursements are paused pending a compliance review.",
    },
    funding: {
      requestedAmount: usd("62000.00"),
      awardedAmount: usd("55000.00"),
      disbursedAmount: usd("27500.00"),
    },
    keyDates: {
      awardDate: awardedOn("2026-01-20"),
      periodOfPerformance: performedOver("2026-02-01", "2027-01-31"),
    },
    opportunity: oppRefFor(9),
    funders: orgRefCollection(HRSA),
    recipientOrganizations: orgRefCollection(RIVERSIDE_CHC),
    customFields: {
      complianceHold: {
        name: "complianceHold",
        fieldType: "string",
        value: "Single-audit finding under review",
        description: "Why disbursements are paused",
      },
    },
    createdAt: "2026-01-20T00:00:00Z",
    lastModifiedAt: "2026-06-12T00:00:00Z",
  },

  {
    // The one award to a person: it carries `recipientIndividual` instead of
    // `recipientOrganizations` on purpose.
    id: "23293a4b-c6d7-48e9-9253-64a5b6c7d8e9",
    title: "Civic Tech Fellowship Award — Cohort 4",
    identifiers: fain("CTF0000104", "01912a8b-7c3d-7894-abcd-ef1234567900"),
    description:
      "Twelve-month fellowship supporting a technologist embedded in a county benefits office.",
    status: {
      value: "awarded",
      description: "Award has been issued and funds are being disbursed.",
    },
    funding: {
      requestedAmount: usd("85000.00"),
      awardedAmount: usd("85000.00"),
      disbursedAmount: usd("21250.00"),
    },
    keyDates: {
      awardDate: awardedOn("2026-02-10"),
      periodOfPerformance: performedOver("2026-03-01", "2027-02-28"),
    },
    opportunity: oppRefFor(22),
    funders: orgRefCollection(NSF),
    recipientIndividual: {
      name: { prefix: "Dr.", firstName: "Grace", lastName: "Porter" },
      identifiers: {
        otherIds: {
          "person:orcid": {
            registry: { code: "person:orcid" },
            id: "0000-0002-1825-0097",
          },
        },
      },
      customFields: {
        hostInstitution: {
          name: "hostInstitution",
          fieldType: "string",
          value: "Ramsey County Human Services",
          description: "Where the fellow is embedded for the award period",
        },
      },
    },
    createdAt: "2026-02-10T00:00:00Z",
    lastModifiedAt: "2026-05-18T00:00:00Z",
  },

  {
    id: "1218293a-b5c6-47d8-9142-5364a5b6c7d8",
    title: "Digital Literacy for Seniors Award",
    identifiers: fain("IMLS0000205", "01912a8b-7c3d-7894-abcd-ef1234567899"),
    description:
      "Funds device-lending and tutoring programs at eleven public libraries.",
    status: {
      value: "custom",
      customValue: "underAppeal",
      description:
        "The recipient has appealed a reduction in the awarded amount.",
    },
    funding: {
      requestedAmount: usd("42000.00"),
      awardedAmount: usd("38000.00"),
      disbursedAmount: usd("9500.00"),
    },
    keyDates: {
      awardDate: awardedOn("2026-04-05"),
      periodOfPerformance: performedOver("2026-05-01", "2027-04-30"),
    },
    opportunity: oppRefFor(14),
    funders: orgRefCollection(NSF),
    recipientOrganizations: orgRefCollection(EXAMPLE_ORG),
    createdAt: "2026-04-05T00:00:00Z",
    lastModifiedAt: "2026-05-30T00:00:00Z",
  },
]);

/** Looks up an award fixture by its exact id. */
export function getAwardById(id: string): Award | undefined {
  return AWARD_FIXTURES.find((award) => award.id === id);
}

/** Every award fixture, as a mutable copy the handlers can sort and page. */
export function allAwards(): Award[] {
  return [...AWARD_FIXTURES];
}
