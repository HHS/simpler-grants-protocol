/**
 * Shared opportunity fixture for the standalone Worker mock (#1077-T2).
 *
 * Ported unchanged from the MSW mock-playground spike (#1049, branch
 * `karina/playground-spike`), which carried zero MSW imports in this file —
 * only its sibling `handlers.ts` was coupled to MSW, which is why the records
 * and shaping moved over as-is while the handlers get rewritten (#1077-T3).
 *
 * A fixed, hand-authored dataset that the deterministic opportunity handlers
 * draw from, so the list, detail, and search endpoints stay mutually
 * consistent and return the same body on every call. Values are
 * assembled from the TypeSpec `@example` decorators under
 * `lib/core/lib/core/models/opportunity/` (semantic, not faker noise). The
 * first record reproduces the spec's own published example (see
 * `CANONICAL_OPPORTUNITY_ID`) so the docs pane and the live response agree, and
 * the next three are carried over verbatim (id + title) from
 * `lib/ts-sdk/examples/mock-api-server.ts` so cross-repo examples stay
 * recognizable.
 *
 * Records are stored in their fullest (v0.3+, detail) shape.
 * `shapeOpportunityForVersion` projects them down to the version/variant a given
 * endpoint should emit:
 *  - `acceptedApplicantTypes` was added in v0.2 → stripped for v0.1.
 *  - `competitions` lives only on `OpportunityDetails` (added v0.2) → stripped
 *    for v0.1 and from any `list`-variant projection.
 */

/**
 * Protocol versions this fixture knows how to shape, matching the versions the
 * docs site publishes specs for (`website/public/openapi/openapi.{v}.yaml`).
 * Shipping a spec version the docs offer without adding it here is caught by
 * `isSupportedVersion`, which keeps the mock from silently 404-ing a version a
 * visitor can select.
 *
 * v0.4.0 (#976) added awards/organizations routes but left the opportunity
 * models untouched, so it shapes identically to v0.3.0 — no new branch in
 * `shapeOpportunityForVersion`. #1077-T4 verifies that against the generated
 * per-version schemas rather than trusting this comment.
 */
export const SUPPORTED_VERSIONS = ["0.1.0", "0.2.0", "0.3.0", "0.4.0"] as const;

/** A protocol version the opportunity handlers can shape responses for. */
export type Version = (typeof SUPPORTED_VERSIONS)[number];

/** Narrows an arbitrary version string to a `Version`. */
export function isSupportedVersion(value: string): value is Version {
  return (SUPPORTED_VERSIONS as readonly string[]).includes(value);
}

/** Which endpoint shape to project: the list returns `OpportunityBase`, the
 * single-item read returns `OpportunityDetails` (v0.2+). */
export type ShapeVariant = "list" | "detail";

/** A monetary amount and its ISO 4217 currency (mirrors `Fields.Money`). */
export interface Money {
  amount: string;
  currency: string;
}

/** Opportunity status (mirrors `Models.OppStatus`). */
export interface OppStatus {
  value: "forecasted" | "open" | "closed" | "custom";
  customValue?: string;
  description?: string;
}

/** A single-date event (mirrors the `singleDate` variant of `Fields.Event`). */
export interface SingleDateEvent {
  name: string;
  eventType: "singleDate";
  date: string;
  time?: string;
  description?: string;
}

/** A date-range event (mirrors the `dateRange` variant of `Fields.Event`). */
export interface DateRangeEvent {
  name: string;
  eventType: "dateRange";
  startDate: string;
  startTime?: string;
  endDate: string;
  endTime?: string;
  description?: string;
}

/** A free-form event (mirrors the `other` variant of `Fields.Event`). */
export interface OtherEvent {
  name: string;
  eventType: "other";
  details?: string;
  description?: string;
}

/**
 * Any `Fields.Event` variant. Named `TimelineEvent` rather than `Event` so it
 * doesn't shadow the DOM global in files that use both.
 */
export type TimelineEvent = SingleDateEvent | DateRangeEvent | OtherEvent;

/**
 * Key dates for an opportunity (mirrors `Models.OppTimeline`). `postDate` and
 * `closeDate` are narrowed to `SingleDateEvent` — the protocol allows any
 * `Event` variant, but the close-date filter and sort read `.date`, so the
 * fixture only ever uses single dates for those two.
 */
export interface OppTimeline {
  postDate?: SingleDateEvent;
  closeDate?: SingleDateEvent;
  otherDates?: Record<string, TimelineEvent>;
}

/** Funding details for an opportunity (mirrors `Models.OppFunding`). */
export interface OppFunding {
  details?: string;
  totalAmountAvailable?: Money;
  minAwardAmount?: Money;
  maxAwardAmount?: Money;
  minAwardCount?: number;
  maxAwardCount?: number;
  estimatedAwardCount?: number;
}

/** An accepted applicant type (mirrors `Models.ApplicantType`, added v0.2). */
export interface ApplicantType {
  value: string;
  customValue?: string;
  description?: string;
}

/** A custom field (mirrors `Fields.CustomField`). */
export interface CustomField {
  name: string;
  fieldType: string;
  value: unknown;
  description?: string;
}

/** Competition status (mirrors `Models.CompetitionStatus`, added v0.2). */
export interface CompetitionStatus {
  value: "open" | "closed" | "custom";
  customValue?: string;
  description?: string;
}

/**
 * Key dates for a competition (mirrors `Models.CompetitionTimeline`, added
 * v0.2). Distinct from `OppTimeline`: competitions use `openDate` (not the
 * opportunity's `postDate`).
 */
export interface CompetitionTimeline {
  openDate?: SingleDateEvent;
  closeDate?: SingleDateEvent;
  otherDates?: Record<string, TimelineEvent>;
}

/**
 * A trimmed competition (mirrors the identifying fields of
 * `Models.CompetitionBase`, added v0.2). The full model carries a required
 * `forms` object; the mock omits it deliberately since these bodies are served
 * as-is (not schema-validated at runtime) and the deep form nesting adds no
 * demo value.
 */
export interface Competition {
  id: string;
  opportunityId: string;
  title: string;
  description?: string;
  status: CompetitionStatus;
  keyDates?: CompetitionTimeline;
}

/** A funding opportunity in its fullest (v0.3+, detail) shape. */
export interface Opportunity {
  id: string;
  title: string;
  status: OppStatus;
  description: string;
  funding?: OppFunding;
  keyDates?: OppTimeline;
  acceptedApplicantTypes?: ApplicantType[];
  source?: string;
  customFields?: Record<string, CustomField>;
  competitions?: Competition[];
  createdAt: string;
  lastModifiedAt: string;
}

/** Convenience builder for a `Money` amount in USD. */
function usd(amount: string): Money {
  return { amount, currency: "USD" };
}

/** Convenience builder for a single-date `closeDate` event. */
function closeOn(date: string): SingleDateEvent {
  return {
    name: "Opportunity close date",
    eventType: "singleDate",
    date,
    time: "17:00:00",
    description: "Opportunity closes for all applications",
  };
}

/** Convenience builder for a single-date `postDate` event. */
function postOn(date: string): SingleDateEvent {
  return {
    name: "Opportunity posted date",
    eventType: "singleDate",
    date,
    description: "Opportunity is posted publicly",
  };
}

const legacyId = (value: number): CustomField => ({
  name: "legacyId",
  fieldType: "integer",
  value,
  description: "Legacy system opportunity ID",
});

const programCode = (value: string): CustomField => ({
  name: "programCode",
  fieldType: "string",
  value,
  description: "Funding program code",
});

/**
 * The id the specs publish as the `example` on `CommonGrants.Types.uuid`, which
 * Swagger UI pre-fills into the `oppId` box when a visitor clicks "Try it out"
 * on `GET /common-grants/opportunities/{oppId}`. A fixture record MUST carry
 * this id, or the very first Execute a visitor runs — with the field untouched
 * — answers 404. It is also the id used throughout the rendered "Example Value"
 * panes, so the record carrying it mirrors those documented values field for
 * field.
 */
export const CANONICAL_OPPORTUNITY_ID = "30a12e5e-5940-4c08-921c-17a8960fcf4b";

/**
 * A well-formed UUID deliberately absent from the fixture, reserved so the
 * detail endpoint's 404 branch has a stable id to demonstrate — it must never
 * be given to a record.
 */
export const RESERVED_MISSING_OPPORTUNITY_ID =
  "00000000-0000-0000-0000-000000000000";

/**
 * The fixture set: 25 opportunities spanning all four statuses, a range of
 * funding amounts, and varied close dates so filtering, sorting, and
 * pagination visibly change results — at the docs' example page size of 20
 * (`@example(20)` on `PaginatedResultsInfo.pageSize`), the list runs to a
 * real second page. The canonical record carries the newest `lastModifiedAt`
 * so it sorts first under the list endpoint's default ordering.
 */
export const OPPORTUNITY_FIXTURES: readonly Opportunity[] = Object.freeze([
  // ---- The spec's own documented example (see CANONICAL_OPPORTUNITY_ID) ----
  {
    // Field values here are copied verbatim from the `@example` decorators the
    // spec renders in Swagger UI's "Example Value" pane for this endpoint
    // (`Types.uuid`, `OpportunityBase.title`/`.description`, `OppStatus`,
    // `OppFunding`, `OppTimeline`), so the documented example and the mock's
    // live response agree field for field. Do not "fix" the 2024 dates against
    // the `open` status — matching the published example is the point.
    id: CANONICAL_OPPORTUNITY_ID,
    title: "Small business grant program",
    status: {
      value: "open",
      description: "The opportunity is currently accepting applications",
    },
    description:
      "This program provides funding to small businesses to help them grow and create jobs",
    funding: {
      totalAmountAvailable: usd("1000000.00"),
      minAwardAmount: usd("10000.00"),
      maxAwardAmount: usd("50000.00"),
      minAwardCount: 5,
      maxAwardCount: 20,
      estimatedAwardCount: 10,
    },
    keyDates: {
      postDate: {
        name: "Opportunity posted date",
        eventType: "singleDate",
        date: "2024-01-15",
        description: "Opportunity is posted publicly",
      },
      closeDate: {
        name: "Opportunity close date",
        eventType: "singleDate",
        date: "2024-12-31",
        time: "17:00:00",
        description: "Opportunity closes for all applications",
      },
      otherDates: {
        anticipatedAward: {
          name: "Anticipated award date",
          eventType: "singleDate",
          date: "2025-03-15",
          description:
            "When we expect to announce awards for this opportunity.",
        },
        applicationPeriod: {
          name: "Application period",
          eventType: "dateRange",
          startDate: "2024-01-01",
          endDate: "2024-01-31",
          endTime: "17:00:00",
          description: "Primary application period for the grant opportunity",
        },
        performancePeriod: {
          name: "Period of Performance",
          eventType: "dateRange",
          startDate: "2024-01-01",
          endDate: "2024-12-31",
          description: "Period of performance for the grant",
        },
        infoSessions: {
          name: "Info sessions",
          eventType: "other",
          details: "Every other Tuesday",
          description: "Info sessions for the opportunity",
        },
      },
    },
    acceptedApplicantTypes: [
      {
        value: "for_profit_small_business",
        description: "For-profit small businesses",
      },
    ],
    source: "https://grants.example.gov/opportunities/small-business",
    customFields: {
      legacyId: legacyId(12344),
      programCode: programCode("SMALL-BIZ"),
    },
    competitions: [
      {
        id: "c0a1b2c3-d4e5-4f60-8a1b-2c3d4e5f6a60",
        opportunityId: CANONICAL_OPPORTUNITY_ID,
        title: "Small business grant program — 2024 Cycle",
        description: "The primary application cycle for the 2024 program year.",
        status: { value: "open", description: "Accepting applications" },
        keyDates: {
          closeDate: closeOn("2024-12-31"),
        },
      },
    ],
    // No `@example` exists for the readOnly audit timestamps; these are chosen
    // so this record sorts first under the list endpoint's default
    // `lastModifiedAt desc` ordering, putting the documented example at the top
    // of the list response.
    createdAt: "2024-01-15T00:00:00Z",
    lastModifiedAt: "2025-06-01T00:00:00Z",
  },
  // ---- Carried over from lib/ts-sdk/examples/mock-api-server.ts (id + title) ----
  {
    id: "573525f2-8e15-4405-83fb-e6523511d893",
    title: "STEM Education Grant Program",
    status: { value: "open", description: "Currently accepting applications" },
    description:
      "A grant program focused on improving STEM education in under-resourced schools.",
    funding: {
      totalAmountAvailable: usd("2000000.00"),
      minAwardAmount: usd("25000.00"),
      maxAwardAmount: usd("250000.00"),
      minAwardCount: 8,
      maxAwardCount: 40,
      estimatedAwardCount: 20,
    },
    keyDates: {
      postDate: postOn("2025-01-15"),
      closeDate: closeOn("2025-06-30"),
    },
    acceptedApplicantTypes: [
      {
        value: "school_district_independent",
        description: "Independent school districts",
      },
      { value: "higher_education_public", description: "Public universities" },
    ],
    source: "https://grants.example.gov/opportunities/stem-education",
    customFields: {
      legacyId: legacyId(12345),
      programCode: programCode("STEM-ED"),
    },
    competitions: [
      {
        id: "c1a2b3c4-d5e6-4f70-8a1b-2c3d4e5f6a70",
        opportunityId: "573525f2-8e15-4405-83fb-e6523511d893",
        title: "STEM Education Grant — 2025 Cohort",
        description: "The primary application cycle for the 2025 STEM cohort.",
        status: { value: "open", description: "Accepting applications" },
        keyDates: { closeDate: closeOn("2025-06-30") },
      },
    ],
    createdAt: "2025-01-01T00:00:00Z",
    lastModifiedAt: "2025-01-15T00:00:00Z",
  },
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    title: "Community Development Grant",
    status: { value: "open", description: "Currently accepting applications" },
    description: "Funding for community development projects in rural areas.",
    funding: {
      totalAmountAvailable: usd("500000.00"),
      minAwardAmount: usd("10000.00"),
      maxAwardAmount: usd("50000.00"),
      minAwardCount: 5,
      maxAwardCount: 20,
      estimatedAwardCount: 10,
    },
    keyDates: {
      postDate: postOn("2025-01-16"),
      closeDate: closeOn("2025-08-15"),
    },
    acceptedApplicantTypes: [
      { value: "non_profit_with_501c3", description: "501(c)(3) non-profits" },
      {
        value: "government_municipal",
        description: "City or township governments",
      },
    ],
    customFields: {
      legacyId: legacyId(12346),
      programCode: programCode("COMM-DEV"),
    },
    createdAt: "2025-01-02T00:00:00Z",
    lastModifiedAt: "2025-01-16T00:00:00Z",
  },
  {
    id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    title: "Education Initiative",
    status: {
      value: "forecasted",
      description: "Not yet open for applications",
    },
    description: "Support for education initiatives, opening later this year.",
    funding: {
      totalAmountAvailable: usd("1000000.00"),
      minAwardAmount: usd("20000.00"),
      maxAwardAmount: usd("100000.00"),
      estimatedAwardCount: 15,
    },
    keyDates: {
      postDate: postOn("2025-01-17"),
      closeDate: closeOn("2025-11-01"),
    },
    acceptedApplicantTypes: [
      {
        value: "higher_education_private",
        description: "Private universities",
      },
    ],
    customFields: {
      legacyId: legacyId(12347),
      programCode: programCode("EDU-INIT"),
    },
    createdAt: "2025-01-03T00:00:00Z",
    lastModifiedAt: "2025-01-17T00:00:00Z",
  },
  // ---- Additional records for filter/sort variety ----
  {
    id: "1f0a2b3c-4d5e-4f60-8a1b-2c3d4e5f6a7b",
    title: "Rural Broadband Expansion",
    status: { value: "forecasted", description: "Anticipated to open in Q3" },
    description:
      "Expanding high-speed broadband access to unserved rural communities.",
    funding: {
      details: "Large infrastructure awards for multi-county deployments.",
      totalAmountAvailable: usd("10000000.00"),
      minAwardAmount: usd("100000.00"),
      maxAwardAmount: usd("2000000.00"),
      minAwardCount: 3,
      maxAwardCount: 12,
      estimatedAwardCount: 6,
    },
    keyDates: {
      postDate: postOn("2025-02-01"),
      closeDate: closeOn("2026-01-31"),
    },
    acceptedApplicantTypes: [
      { value: "government_county", description: "County governments" },
      {
        value: "for_profit_small_business",
        description: "Small telecom providers",
      },
    ],
    createdAt: "2025-02-01T00:00:00Z",
    lastModifiedAt: "2025-02-10T00:00:00Z",
  },
  {
    id: "2a3b4c5d-6e7f-4081-9b2c-3d4e5f6a7b8c",
    title: "Small Business Recovery Fund",
    status: { value: "open", description: "Currently accepting applications" },
    description:
      "Grants to help small businesses recover from economic disruption.",
    funding: {
      details: "We'll be awarding between $5,000 and $25,000 per recipient",
      minAwardAmount: usd("5000.00"),
      maxAwardAmount: usd("25000.00"),
      minAwardCount: 20,
      maxAwardCount: 100,
      estimatedAwardCount: 60,
    },
    keyDates: {
      postDate: postOn("2025-02-15"),
      closeDate: closeOn("2025-07-15"),
    },
    acceptedApplicantTypes: [
      {
        value: "for_profit_small_business",
        description: "For-profit small businesses",
      },
    ],
    createdAt: "2025-02-15T00:00:00Z",
    lastModifiedAt: "2025-02-20T00:00:00Z",
  },
  {
    id: "3b4c5d6e-7f80-4192-8c3d-4e5f6a7b8c9d",
    title: "Coastal Resilience Grant",
    status: {
      value: "closed",
      description: "No longer accepting applications",
    },
    description:
      "Funding for coastal communities to build resilience against flooding.",
    funding: {
      totalAmountAvailable: usd("250000.00"),
      minAwardAmount: usd("15000.00"),
      maxAwardAmount: usd("75000.00"),
      estimatedAwardCount: 5,
    },
    keyDates: {
      postDate: postOn("2024-06-01"),
      closeDate: closeOn("2024-12-31"),
    },
    acceptedApplicantTypes: [
      { value: "government_municipal", description: "Coastal municipalities" },
    ],
    createdAt: "2024-06-01T00:00:00Z",
    lastModifiedAt: "2025-01-05T00:00:00Z",
  },
  {
    id: "4c5d6e7f-8091-42a3-9d4e-5f6a7b8c9d0e",
    title: "Clean Energy Innovation",
    status: { value: "open", description: "Currently accepting applications" },
    description:
      "Supporting research and deployment of clean energy technologies.",
    funding: {
      totalAmountAvailable: usd("5000000.00"),
      minAwardAmount: usd("50000.00"),
      maxAwardAmount: usd("500000.00"),
      minAwardCount: 5,
      maxAwardCount: 25,
      estimatedAwardCount: 12,
    },
    keyDates: {
      postDate: postOn("2025-03-01"),
      closeDate: closeOn("2025-09-30"),
    },
    acceptedApplicantTypes: [
      {
        value: "higher_education_public",
        description: "Public research universities",
      },
      {
        value: "for_profit_not_small_business",
        description: "Energy companies",
      },
    ],
    competitions: [
      {
        id: "c2b3c4d5-e6f7-4081-9b2c-3d4e5f6a7b81",
        opportunityId: "4c5d6e7f-8091-42a3-9d4e-5f6a7b8c9d0e",
        title: "Clean Energy Innovation — Research Track",
        description: "Applications for early-stage research projects.",
        status: { value: "open", description: "Accepting applications" },
        keyDates: { closeDate: closeOn("2025-09-30") },
      },
    ],
    createdAt: "2025-03-01T00:00:00Z",
    lastModifiedAt: "2025-03-12T00:00:00Z",
  },
  {
    id: "5d6e7f80-91a2-43b4-8e5f-6a7b8c9d0e1f",
    title: "Workforce Apprenticeship Program",
    status: {
      value: "closed",
      description: "No longer accepting applications",
    },
    description:
      "Establishing registered apprenticeships in high-demand trades.",
    funding: {
      totalAmountAvailable: usd("1200000.00"),
      minAwardAmount: usd("30000.00"),
      maxAwardAmount: usd("120000.00"),
      estimatedAwardCount: 10,
    },
    keyDates: {
      postDate: postOn("2024-09-01"),
      closeDate: closeOn("2025-02-28"),
    },
    acceptedApplicantTypes: [
      {
        value: "organization",
        description: "Workforce development organizations",
      },
    ],
    createdAt: "2024-09-01T00:00:00Z",
    lastModifiedAt: "2025-02-28T00:00:00Z",
  },
  {
    id: "6e7f8091-a2b3-44c5-9f60-7b8c9d0e1f20",
    title: "Community Health Outreach",
    status: {
      value: "custom",
      customValue: "under_review",
      description: "Applications received are under review by the committee",
    },
    description:
      "Expanding preventive health services in underserved neighborhoods.",
    funding: {
      totalAmountAvailable: usd("750000.00"),
      minAwardAmount: usd("10000.00"),
      maxAwardAmount: usd("60000.00"),
      estimatedAwardCount: 15,
    },
    keyDates: {
      postDate: postOn("2025-01-10"),
      closeDate: closeOn("2025-05-15"),
    },
    acceptedApplicantTypes: [
      {
        value: "non_profit_with_501c3",
        description: "Community health non-profits",
      },
    ],
    createdAt: "2025-01-10T00:00:00Z",
    lastModifiedAt: "2025-05-16T00:00:00Z",
  },
  {
    id: "7f8091a2-b3c4-45d6-8071-8c9d0e1f2031",
    title: "Arts & Culture Preservation",
    status: {
      value: "custom",
      customValue: "archived",
      description:
        "The opportunity is archived and shouldn't appear in search results",
    },
    description:
      "Preserving local arts, cultural heritage, and historic landmarks.",
    funding: {
      totalAmountAvailable: usd("300000.00"),
      minAwardAmount: usd("5000.00"),
      maxAwardAmount: usd("30000.00"),
      estimatedAwardCount: 20,
    },
    keyDates: {
      postDate: postOn("2024-04-01"),
      closeDate: closeOn("2024-10-31"),
    },
    acceptedApplicantTypes: [
      { value: "non_profit_with_501c3", description: "Arts non-profits" },
      { value: "individual", description: "Individual artists" },
    ],
    createdAt: "2024-04-01T00:00:00Z",
    lastModifiedAt: "2024-11-01T00:00:00Z",
  },
  // ---- Growth records (#3C-1-T1): enough volume that pagination, sorting,
  // and the search filters visibly bite at the docs' example page size (20).
  // Every `lastModifiedAt` stays before the canonical record's 2025-06-01 so
  // the documented example keeps sorting first. All amounts stay USD — the
  // handler suite pins that a EUR-denominated bound matches zero records. ----
  {
    id: "8091a2b3-c4d5-46e7-8293-9d0e1f203142",
    title: "Urban Tree Canopy Grant",
    status: { value: "open", description: "Currently accepting applications" },
    description:
      "Planting and maintaining urban tree canopy in heat-vulnerable neighborhoods.",
    funding: {
      totalAmountAvailable: usd("900000.00"),
      minAwardAmount: usd("25000.00"),
      maxAwardAmount: usd("150000.00"),
      minAwardCount: 4,
      maxAwardCount: 15,
      estimatedAwardCount: 8,
    },
    keyDates: {
      postDate: postOn("2025-03-15"),
      closeDate: closeOn("2025-10-15"),
    },
    acceptedApplicantTypes: [
      { value: "government_municipal", description: "City governments" },
      {
        value: "non_profit_with_501c3",
        description: "Urban forestry non-profits",
      },
    ],
    customFields: {
      legacyId: legacyId(12348),
      programCode: programCode("URBAN-TREE"),
    },
    createdAt: "2025-03-15T00:00:00Z",
    lastModifiedAt: "2025-03-20T00:00:00Z",
  },
  {
    id: "91a2b3c4-d5e6-47f8-93a4-0e1f20314253",
    title: "Rural Health Clinic Modernization",
    status: { value: "open", description: "Currently accepting applications" },
    description:
      "Modernizing facilities and equipment at rural health clinics.",
    funding: {
      totalAmountAvailable: usd("3200000.00"),
      minAwardAmount: usd("100000.00"),
      maxAwardAmount: usd("400000.00"),
      estimatedAwardCount: 8,
    },
    keyDates: {
      postDate: postOn("2025-04-01"),
      closeDate: closeOn("2025-12-01"),
    },
    acceptedApplicantTypes: [
      {
        value: "non_profit_with_501c3",
        description: "Non-profit clinic operators",
      },
      { value: "government_county", description: "County health departments" },
    ],
    competitions: [
      {
        id: "c3c4d5e6-f708-4192-8c3d-4e5f6a7b8c92",
        opportunityId: "91a2b3c4-d5e6-47f8-93a4-0e1f20314253",
        title: "Rural Health Clinic Modernization — FY25 Round",
        description: "The fiscal-year 2025 application round.",
        status: { value: "open", description: "Accepting applications" },
        keyDates: { closeDate: closeOn("2025-12-01") },
      },
    ],
    createdAt: "2025-04-01T00:00:00Z",
    lastModifiedAt: "2025-04-10T00:00:00Z",
  },
  {
    id: "a2b3c4d5-e6f7-4809-84b5-1f2031425364",
    title: "Watershed Restoration Partnership",
    status: { value: "open", description: "Currently accepting applications" },
    description:
      "Restoring degraded watersheds through multi-stakeholder partnerships.",
    funding: {
      totalAmountAvailable: usd("1800000.00"),
      minAwardAmount: usd("50000.00"),
      maxAwardAmount: usd("300000.00"),
      minAwardCount: 4,
      maxAwardCount: 12,
      estimatedAwardCount: 6,
    },
    keyDates: {
      postDate: postOn("2025-05-01"),
      closeDate: closeOn("2026-03-31"),
    },
    acceptedApplicantTypes: [
      {
        value: "government_state",
        description: "State environmental agencies",
      },
      {
        value: "non_profit_with_501c3",
        description: "Watershed conservation non-profits",
      },
    ],
    createdAt: "2025-05-01T00:00:00Z",
    lastModifiedAt: "2025-05-08T00:00:00Z",
  },
  {
    id: "b3c4d5e6-f708-491a-95c6-203142536475",
    title: "Digital Literacy for Seniors",
    status: { value: "open", description: "Currently accepting applications" },
    description:
      "Teaching digital skills to older adults through community programs.",
    funding: {
      totalAmountAvailable: usd("320000.00"),
      minAwardAmount: usd("8000.00"),
      maxAwardAmount: usd("40000.00"),
      estimatedAwardCount: 12,
    },
    keyDates: {
      postDate: postOn("2025-02-20"),
      closeDate: closeOn("2025-08-31"),
    },
    acceptedApplicantTypes: [
      {
        value: "non_profit_with_501c3",
        description: "Senior services non-profits",
      },
      { value: "organization", description: "Community organizations" },
    ],
    customFields: {
      legacyId: legacyId(12349),
      programCode: programCode("DIG-LIT"),
    },
    createdAt: "2025-02-20T00:00:00Z",
    lastModifiedAt: "2025-02-25T00:00:00Z",
  },
  {
    id: "c4d5e6f7-0819-42ab-86d7-314253647586",
    title: "First-Time Farmer Support",
    status: {
      value: "forecasted",
      description: "Anticipated to open in early 2026",
    },
    description:
      "Startup support for first-time farmers and beginning ranchers.",
    funding: {
      totalAmountAvailable: usd("640000.00"),
      minAwardAmount: usd("20000.00"),
      maxAwardAmount: usd("80000.00"),
      estimatedAwardCount: 10,
    },
    keyDates: {
      postDate: postOn("2026-01-15"),
      closeDate: closeOn("2026-04-30"),
    },
    acceptedApplicantTypes: [
      { value: "individual", description: "Individual farmers" },
      {
        value: "for_profit_small_business",
        description: "Small family farm businesses",
      },
    ],
    createdAt: "2025-04-20T00:00:00Z",
    lastModifiedAt: "2025-04-22T00:00:00Z",
  },
  {
    id: "d5e6f708-192a-43bc-97e8-425364758697",
    title: "Regional Transit Electrification",
    status: {
      value: "forecasted",
      description: "Anticipated to open in Q4",
    },
    description:
      "Converting regional bus fleets to zero-emission vehicles with charging infrastructure.",
    funding: {
      details:
        "Large capital awards for zero-emission bus fleets and charging infrastructure.",
      totalAmountAvailable: usd("12000000.00"),
      minAwardAmount: usd("500000.00"),
      maxAwardAmount: usd("1500000.00"),
      minAwardCount: 4,
      maxAwardCount: 10,
      estimatedAwardCount: 6,
    },
    keyDates: {
      postDate: postOn("2025-11-01"),
      closeDate: closeOn("2026-06-30"),
    },
    acceptedApplicantTypes: [
      {
        value: "government_special_district",
        description: "Transit authorities",
      },
      { value: "government_municipal", description: "City governments" },
    ],
    createdAt: "2025-03-05T00:00:00Z",
    lastModifiedAt: "2025-03-30T00:00:00Z",
  },
  {
    id: "e6f70819-2a3b-44cd-88f9-536475869708",
    title: "Tribal Cultural Preservation",
    status: {
      value: "forecasted",
      description: "Anticipated to open in the fall",
    },
    description: "Preserving tribal languages, traditions, and cultural sites.",
    funding: {
      totalAmountAvailable: usd("450000.00"),
      minAwardAmount: usd("15000.00"),
      maxAwardAmount: usd("90000.00"),
      estimatedAwardCount: 6,
    },
    keyDates: {
      postDate: postOn("2025-09-01"),
      closeDate: closeOn("2026-02-28"),
    },
    acceptedApplicantTypes: [
      { value: "government_tribal", description: "Tribal governments" },
      {
        value: "organization_tribal_other",
        description: "Tribal cultural organizations",
      },
    ],
    createdAt: "2025-01-25T00:00:00Z",
    lastModifiedAt: "2025-02-03T00:00:00Z",
  },
  {
    id: "f708192a-3b4c-45de-990a-647586970819",
    title: "Disaster Preparedness Micro-grants",
    status: {
      value: "closed",
      description: "No longer accepting applications",
    },
    description:
      "Micro-grants for neighborhood-level disaster preparedness projects.",
    funding: {
      details:
        "Micro-grants disbursed on a rolling basis until funds were exhausted.",
      totalAmountAvailable: usd("150000.00"),
      minAwardAmount: usd("2500.00"),
      maxAwardAmount: usd("7500.00"),
      maxAwardCount: 60,
      estimatedAwardCount: 45,
    },
    keyDates: {
      postDate: postOn("2024-05-01"),
      closeDate: closeOn("2024-08-15"),
    },
    acceptedApplicantTypes: [
      {
        value: "non_profit_with_501c3",
        description: "Community preparedness non-profits",
      },
      { value: "organization", description: "Neighborhood associations" },
    ],
    createdAt: "2024-05-01T00:00:00Z",
    lastModifiedAt: "2024-08-20T00:00:00Z",
  },
  {
    id: "08192a3b-4c5d-46ef-8a1b-758697081920",
    title: "Veteran Entrepreneurship Initiative",
    status: {
      value: "closed",
      description: "No longer accepting applications",
    },
    description:
      "Business startup grants and mentorship for veteran entrepreneurs.",
    funding: {
      totalAmountAvailable: usd("480000.00"),
      minAwardAmount: usd("12000.00"),
      maxAwardAmount: usd("60000.00"),
      estimatedAwardCount: 10,
    },
    keyDates: {
      postDate: postOn("2024-10-01"),
      closeDate: closeOn("2025-01-31"),
    },
    acceptedApplicantTypes: [
      { value: "individual", description: "Individual veterans" },
      {
        value: "for_profit_small_business",
        description: "Veteran-owned small businesses",
      },
    ],
    customFields: {
      legacyId: legacyId(12350),
      programCode: programCode("VET-BIZ"),
    },
    createdAt: "2024-10-01T00:00:00Z",
    lastModifiedAt: "2025-02-01T00:00:00Z",
  },
  {
    id: "192a3b4c-5d6e-4701-8b2c-869708192a3b",
    title: "School Nutrition Improvement",
    status: {
      value: "closed",
      description: "No longer accepting applications",
    },
    description:
      "Upgrading school kitchens and sourcing fresh local ingredients.",
    funding: {
      totalAmountAvailable: usd("720000.00"),
      minAwardAmount: usd("18000.00"),
      maxAwardAmount: usd("90000.00"),
      estimatedAwardCount: 8,
    },
    keyDates: {
      postDate: postOn("2024-07-15"),
      closeDate: closeOn("2024-11-30"),
    },
    acceptedApplicantTypes: [
      {
        value: "school_district_independent",
        description: "Independent school districts",
      },
      { value: "government_municipal", description: "Municipal school boards" },
    ],
    createdAt: "2024-07-15T00:00:00Z",
    lastModifiedAt: "2024-12-05T00:00:00Z",
  },
  {
    id: "2a3b4c5d-6e7f-4812-9c3d-970819202a3b",
    title: "Affordable Housing Predevelopment",
    status: {
      value: "closed",
      description: "No longer accepting applications",
    },
    description:
      "Predevelopment financing for affordable housing projects seeking site control.",
    funding: {
      totalAmountAvailable: usd("2500000.00"),
      minAwardAmount: usd("100000.00"),
      maxAwardAmount: usd("500000.00"),
      minAwardCount: 3,
      maxAwardCount: 8,
      estimatedAwardCount: 5,
    },
    keyDates: {
      postDate: postOn("2024-08-01"),
      closeDate: closeOn("2025-03-15"),
    },
    acceptedApplicantTypes: [
      {
        value: "non_profit_with_501c3",
        description: "Non-profit housing developers",
      },
      {
        value: "government_municipal",
        description: "Municipal housing authorities",
      },
    ],
    competitions: [
      {
        id: "c4d5e6f7-0819-42ab-9d4e-5f6a7b8ca3b4",
        opportunityId: "2a3b4c5d-6e7f-4812-9c3d-970819202a3b",
        title: "Affordable Housing Predevelopment — Round 2",
        description: "The second and final application round.",
        status: { value: "closed", description: "Round closed" },
        keyDates: { closeDate: closeOn("2025-03-15") },
      },
    ],
    createdAt: "2024-08-01T00:00:00Z",
    lastModifiedAt: "2025-03-21T00:00:00Z",
  },
  {
    id: "3b4c5d6e-7f80-4923-8d4e-08192a3b4c5d",
    title: "Civic Tech Fellows",
    status: {
      value: "custom",
      customValue: "paused",
      description: "The program is paused pending a funding review",
    },
    description:
      "Fellowships placing technologists in local government for a year of service.",
    funding: {
      totalAmountAvailable: usd("600000.00"),
      minAwardAmount: usd("50000.00"),
      maxAwardAmount: usd("100000.00"),
      estimatedAwardCount: 6,
    },
    keyDates: {
      postDate: postOn("2025-01-20"),
      closeDate: closeOn("2025-04-30"),
    },
    acceptedApplicantTypes: [
      { value: "individual", description: "Individual technologists" },
      {
        value: "higher_education_public",
        description: "Public university partners",
      },
    ],
    createdAt: "2025-01-20T00:00:00Z",
    lastModifiedAt: "2025-05-02T00:00:00Z",
  },
  {
    id: "4c5d6e7f-8091-4a34-9e5f-192a3b4c5d6e",
    title: "Main Street Revitalization",
    status: {
      value: "custom",
      customValue: "awarded",
      description:
        "Awards have been announced and agreements are being executed",
    },
    description:
      "Restoring historic commercial corridors and supporting storefront businesses.",
    funding: {
      totalAmountAvailable: usd("1100000.00"),
      minAwardAmount: usd("30000.00"),
      maxAwardAmount: usd("110000.00"),
      estimatedAwardCount: 10,
    },
    keyDates: {
      postDate: postOn("2024-03-01"),
      closeDate: closeOn("2024-09-30"),
    },
    acceptedApplicantTypes: [
      { value: "government_municipal", description: "City governments" },
      {
        value: "non_profit_with_501c3",
        description: "Main street organizations",
      },
    ],
    customFields: {
      legacyId: legacyId(12351),
      programCode: programCode("MAIN-ST"),
    },
    createdAt: "2024-03-01T00:00:00Z",
    lastModifiedAt: "2024-12-15T00:00:00Z",
  },
  {
    id: "5d6e7f80-91a2-4b45-8f60-2a3b4c5d6e7f",
    title: "Ocean Plastics Research Challenge",
    status: {
      value: "custom",
      customValue: "under_review",
      description:
        "Submissions are under peer review; results expected next quarter",
    },
    description:
      "Research into scalable methods for removing plastics from marine environments.",
    funding: {
      totalAmountAvailable: usd("950000.00"),
      minAwardAmount: usd("75000.00"),
      maxAwardAmount: usd("190000.00"),
      estimatedAwardCount: 5,
    },
    keyDates: {
      postDate: postOn("2024-12-01"),
      closeDate: closeOn("2025-05-31"),
    },
    acceptedApplicantTypes: [
      {
        value: "higher_education_public",
        description: "Public research universities",
      },
      {
        value: "higher_education_private",
        description: "Private research universities",
      },
    ],
    createdAt: "2024-12-01T00:00:00Z",
    lastModifiedAt: "2025-05-30T00:00:00Z",
  },
]);

/**
 * Projects an opportunity down to the shape a given protocol version + endpoint
 * variant should emit. Strips fields that don't exist in the target version and
 * removes `competitions` from list-variant projections.
 *
 * @param opp - A full (v0.3+, detail) fixture record.
 * @param version - Target protocol version.
 * @param variant - `"list"` (OpportunityBase) or `"detail"` (OpportunityDetails).
 * @returns A shallow copy projected to the target shape (original is untouched).
 */
export function shapeOpportunityForVersion(
  opp: Opportunity,
  version: Version,
  variant: ShapeVariant = "list",
): Opportunity {
  const shaped: Opportunity = { ...opp };

  // `competitions` only exists on the detail (OpportunityDetails) shape.
  if (variant === "list") {
    delete shaped.competitions;
  }

  // v0.1 predates both `acceptedApplicantTypes` and `OpportunityDetails`.
  if (version === "0.1.0") {
    delete shaped.acceptedApplicantTypes;
    delete shaped.competitions;
  }

  return shaped;
}

/** Looks up a fixture record by its exact id. */
export function getById(id: string): Opportunity | undefined {
  return OPPORTUNITY_FIXTURES.find((opp) => opp.id === id);
}

/** Returns every fixture projected to the list (OpportunityBase) shape for a version. */
export function allForVersion(version: Version): Opportunity[] {
  return OPPORTUNITY_FIXTURES.map((opp) =>
    shapeOpportunityForVersion(opp, version, "list"),
  );
}
