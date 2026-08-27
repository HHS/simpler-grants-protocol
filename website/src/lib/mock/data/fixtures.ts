/**
 * Shared opportunity fixture for the standalone Worker mock (#1077).
 *
 * Ported unchanged from the MSW mock-playground spike (#1049, branch
 * `karina/playground-spike`), which carried zero MSW imports in this file —
 * only its sibling `handlers.ts` was coupled to MSW, which is why the records
 * and shaping moved over as-is while the handlers get rewritten (#1077).
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
 * `shapeOpportunityForVersion`. #1077 verifies that against the generated
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
 * The fixture set: 11 opportunities spanning all four statuses, a range of
 * funding amounts, and varied close dates so filtering and sorting visibly
 * change results. Sorted newest-first by `lastModifiedAt` to match the list
 * endpoint's default ordering.
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
