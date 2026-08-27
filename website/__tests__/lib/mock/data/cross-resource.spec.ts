/**
 * Cross-resource referential consistency across the whole fixture set
 * (#3C-2-T1).
 *
 * The acceptance criterion is short — "ids referenced across resources resolve
 * to records that exist" — but it is the one property that no per-resource suite
 * can check, because every one of them only knows its own module. An award's
 * `funders.primary.id` is just a string to `awards.spec.ts`; whether it names a
 * real organization is a question only this file is in a position to ask.
 *
 * Most of these references are built by helpers that already throw on a bad id
 * (`orgRef` in `data/organizations.ts`, `formsFrom` in `data/competitions.ts`,
 * `appFor` in `data/applications.ts`), so a dangling reference usually fails at
 * module load rather than here. This suite is the backstop for the ones that are
 * written as literals — an award's `parent`, the `competitions` previews nested
 * on an opportunity — and, more importantly, it is where the *reason* each
 * reference has to resolve is written down. A helper that throws tells you the
 * id was wrong; it does not tell you that a visitor's first click on
 * "Try it out" is what breaks.
 *
 * The `Types.uuid` prefill invariants at the bottom are the ones most likely to
 * be broken by a well-meaning future edit — "these three fixtures all have the
 * same id, let me fix that" — so they are asserted with the reason attached.
 */

import { describe, it, expect } from "vitest";
import {
  APPLICATION_FIXTURES,
  CANONICAL_APPLICATION_ID,
  canonicalPrefillResolves,
  getApplicationById,
  getFormResponse,
} from "@/lib/mock/data/applications";
import {
  AWARD_FIXTURES,
  CANONICAL_AWARD_ID,
  getAwardById,
} from "@/lib/mock/data/awards";
import {
  CANONICAL_COMPETITION_ID,
  COMPETITION_FIXTURES,
  getCompetitionById,
} from "@/lib/mock/data/competitions";
import {
  CANONICAL_OPPORTUNITY_ID,
  OPPORTUNITY_FIXTURES,
} from "@/lib/mock/data/fixtures";
import {
  CANONICAL_FORM_ID,
  FORM_FIXTURES,
  getFormById,
} from "@/lib/mock/data/forms";
import { CANONICAL_RECORD_ID, RESERVED_MISSING_ID } from "@/lib/mock/data/ids";
import {
  CANONICAL_ORGANIZATION_ID,
  CANONICAL_ORG_REVISION_ID,
  ORGANIZATION_FIXTURES,
  ORG_REVISION_FIXTURES,
  getOrganizationById,
  getRevision,
  type Identifier,
  type IdentifierValue,
  type OrgRefCollection,
} from "@/lib/mock/data/organizations";

/** Every id in an `OrgRefCollection`, primary plus any keyed others. */
function orgRefIds(collection: OrgRefCollection | undefined): string[] {
  if (!collection) return [];
  return [
    collection.primary.id,
    ...Object.values(collection.otherOrgs ?? {}).map((ref) => ref.id),
  ];
}

const opportunityIds = new Set(OPPORTUNITY_FIXTURES.map((opp) => opp.id));

describe("awards reference records that exist", () => {
  it("points every `opportunity` reference at a real opportunity, with its real title", () => {
    for (const award of AWARD_FIXTURES) {
      if (!award.opportunity) continue;

      const opportunity = OPPORTUNITY_FIXTURES.find(
        (opp) => opp.id === award.opportunity!.id,
      );

      expect(
        opportunity,
        `award ${award.id} references opportunity ${award.opportunity.id}`,
      ).toBeDefined();
      // The title is checked too, not just the id: a reference carrying a stale
      // title is a dangling reference a caller can actually see, since the
      // preview is the whole point of `OppRef`.
      expect(award.opportunity.title).toBe(opportunity!.title);
    }
  });

  it("points every `application` reference at a real application, with its real title", () => {
    for (const award of AWARD_FIXTURES) {
      if (!award.application) continue;

      const application = getApplicationById(award.application.id);

      expect(
        application,
        `award ${award.id} references application ${award.application.id}`,
      ).toBeDefined();
      expect(award.application.title).toBe(application!.title);
    }
  });

  it("points every funder and recipient organization at a real organization", () => {
    for (const award of AWARD_FIXTURES) {
      const ids = [
        ...orgRefIds(award.funders),
        ...orgRefIds(award.recipientOrganizations),
      ];

      for (const id of ids) {
        expect(
          getOrganizationById(id),
          `award ${award.id} references organization ${id}`,
        ).toBeDefined();
      }
    }
  });

  it("points every `parent` award at a real award, with its real title", () => {
    const withParents = AWARD_FIXTURES.filter((award) => award.parent);

    // Written as a literal rather than through a helper, so this is the case the
    // suite genuinely guards rather than merely restates.
    expect(withParents.length).toBeGreaterThan(0);

    for (const award of withParents) {
      const parent = getAwardById(award.parent!.id);

      expect(
        parent,
        `award ${award.id} references parent award ${award.parent!.id}`,
      ).toBeDefined();
      expect(award.parent!.title).toBe(parent!.title);
    }
  });

  it("never points an award at itself as its own parent", () => {
    for (const award of AWARD_FIXTURES) {
      expect(award.parent?.id).not.toBe(award.id);
    }
  });
});

describe("competitions reference records that exist", () => {
  it("points every `opportunityId` at a real opportunity", () => {
    for (const competition of COMPETITION_FIXTURES) {
      expect(
        opportunityIds.has(competition.opportunityId),
        `competition ${competition.id} references opportunity ${competition.opportunityId}`,
      ).toBe(true);
    }
  });

  it("embeds only real form fixtures, by identity", () => {
    for (const competition of COMPETITION_FIXTURES) {
      const embedded = Object.values(competition.forms.forms);
      expect(embedded.length).toBeGreaterThan(0);

      for (const form of embedded) {
        // Identity, not just id equality: the competition fixtures embed the
        // live records from `FORM_FIXTURES`, so a copy that had drifted from the
        // original would fail here even though its id still resolved.
        expect(getFormById(form.id)).toBe(form);
      }
    }
  });

  it("names `validation.required` entries that are keys of `forms`, not form ids", () => {
    for (const competition of COMPETITION_FIXTURES) {
      const keys = Object.keys(competition.forms.forms);

      for (const required of competition.forms.validation?.required ?? []) {
        expect(
          keys,
          `competition ${competition.id} requires "${required}"`,
        ).toContain(required);
      }
    }
  });
});

describe("applications reference records that exist", () => {
  it("points every `competitionId` at a real competition", () => {
    for (const application of APPLICATION_FIXTURES) {
      expect(
        getCompetitionById(application.competitionId),
        `application ${application.id} references competition ${application.competitionId}`,
      ).toBeDefined();
    }
  });

  it("carries the `opportunityId` its own competition carries", () => {
    for (const application of APPLICATION_FIXTURES) {
      const competition = getCompetitionById(application.competitionId)!;

      // The two could disagree without either being dangling — which is exactly
      // the kind of inconsistency a hand-written fixture set drifts into, and
      // what a visitor comparing an application to its competition would notice.
      expect(application.opportunityId).toBe(competition.opportunityId);
    }
  });

  it("points every form response at a real form, and at its own application", () => {
    for (const application of APPLICATION_FIXTURES) {
      for (const response of Object.values(application.formResponses)) {
        expect(
          getFormById(response.formId),
          `application ${application.id} responds to form ${response.formId}`,
        ).toBeDefined();
        expect(response.applicationId).toBe(application.id);
      }
    }
  });

  it("only answers forms its own competition asks for", () => {
    for (const application of APPLICATION_FIXTURES) {
      const competition = getCompetitionById(application.competitionId)!;
      const askedFor = new Set(
        Object.values(competition.forms.forms).map((form) => form.id),
      );

      for (const response of Object.values(application.formResponses)) {
        expect(
          askedFor.has(response.formId),
          `application ${application.id} answers form ${response.formId}, which competition ${competition.id} does not ask for`,
        ).toBe(true);
      }
    }
  });
});

describe("organizations and their changes", () => {
  it("scopes every revision to a real organization", () => {
    for (const revision of ORG_REVISION_FIXTURES) {
      expect(
        getOrganizationById(revision.orgId),
        `revision ${revision.id} belongs to organization ${revision.orgId}`,
      ).toBeDefined();
    }
  });

  it("gives every accepted revision a snapshot, and every pending one none", () => {
    for (const revision of ORG_REVISION_FIXTURES) {
      // The protocol describes `snapshot` as the record "with the change
      // applied", which a change that was never applied does not have.
      if (revision.status.value === "accepted") {
        expect(revision.snapshot, `revision ${revision.id}`).toBeDefined();
      }
      if (revision.status.value === "pending") {
        expect(revision.snapshot, `revision ${revision.id}`).toBeUndefined();
      }
    }
  });

  it("snapshots the organization the revision actually belongs to", () => {
    for (const revision of ORG_REVISION_FIXTURES) {
      if (!revision.snapshot) continue;
      expect(revision.snapshot.id).toBe(revision.orgId);
    }
  });
});

describe("opportunities' nested competition previews", () => {
  it("keeps every preview's `opportunityId` pointing back at its own opportunity", () => {
    for (const opportunity of OPPORTUNITY_FIXTURES) {
      for (const preview of opportunity.competitions ?? []) {
        expect(
          preview.opportunityId,
          `competition preview ${preview.id} nested on opportunity ${opportunity.id}`,
        ).toBe(opportunity.id);
      }
    }
  });
});

describe("the Types.uuid prefill invariant", () => {
  // Every path parameter in the spec — oppId, awdId, orgId, appId, formId,
  // compId, changeId — resolves to the same `CommonGrants.Types.uuid` schema,
  // which publishes one `example`. Swagger UI pre-fills a path box from that
  // example, so EVERY detail route's first Execute arrives carrying the same
  // uuid. These assertions are what stop a future edit from "cleaning up" the
  // shared id and silently putting 404s back on the docs page — which is the
  // exact failure #3C-2-T1 was opened to remove.
  it("gives every resource a canonical record carrying the shared uuid example", () => {
    expect(CANONICAL_OPPORTUNITY_ID).toBe(CANONICAL_RECORD_ID);
    expect(CANONICAL_AWARD_ID).toBe(CANONICAL_RECORD_ID);
    expect(CANONICAL_ORGANIZATION_ID).toBe(CANONICAL_RECORD_ID);
    expect(CANONICAL_APPLICATION_ID).toBe(CANONICAL_RECORD_ID);
    expect(CANONICAL_FORM_ID).toBe(CANONICAL_RECORD_ID);
    expect(CANONICAL_COMPETITION_ID).toBe(CANONICAL_RECORD_ID);
  });

  it("resolves that uuid to a real record in every resource", () => {
    expect(
      OPPORTUNITY_FIXTURES.some((opp) => opp.id === CANONICAL_RECORD_ID),
    ).toBe(true);
    expect(getAwardById(CANONICAL_RECORD_ID)).toBeDefined();
    expect(getOrganizationById(CANONICAL_RECORD_ID)).toBeDefined();
    expect(getApplicationById(CANONICAL_RECORD_ID)).toBeDefined();
    expect(getFormById(CANONICAL_RECORD_ID)).toBeDefined();
    expect(getCompetitionById(CANONICAL_RECORD_ID)).toBeDefined();
  });

  it("resolves the two-parameter routes, where BOTH boxes pre-fill with it", () => {
    // GET /orgs/{orgId}/changes/{changeId}
    expect(CANONICAL_ORG_REVISION_ID).toBe(CANONICAL_RECORD_ID);
    expect(getRevision(CANONICAL_RECORD_ID, CANONICAL_RECORD_ID)).toBeDefined();

    // GET|PUT /applications/{appId}/forms/{formId}
    expect(canonicalPrefillResolves()).toBe(true);
    const application = getApplicationById(CANONICAL_RECORD_ID)!;
    expect(getFormResponse(application, CANONICAL_RECORD_ID)).toBeDefined();
  });

  it("keeps the reserved 404 id absent from every resource", () => {
    // Each resource's detail route needs a stable id to demonstrate its 404
    // branch with. Handing it to a record in any one of them would silently turn
    // that documented 404 into a 200.
    expect(
      OPPORTUNITY_FIXTURES.some((opp) => opp.id === RESERVED_MISSING_ID),
    ).toBe(false);
    expect(getAwardById(RESERVED_MISSING_ID)).toBeUndefined();
    expect(getOrganizationById(RESERVED_MISSING_ID)).toBeUndefined();
    expect(getApplicationById(RESERVED_MISSING_ID)).toBeUndefined();
    expect(getFormById(RESERVED_MISSING_ID)).toBeUndefined();
    expect(getCompetitionById(RESERVED_MISSING_ID)).toBeUndefined();
    expect(
      ORG_REVISION_FIXTURES.some(
        (revision) => revision.id === RESERVED_MISSING_ID,
      ),
    ).toBe(false);
  });

  it("keeps ids unique within each resource, since they are shared across them", () => {
    const sets: Array<[string, string[]]> = [
      ["opportunities", OPPORTUNITY_FIXTURES.map((r) => r.id)],
      ["awards", AWARD_FIXTURES.map((r) => r.id)],
      ["organizations", ORGANIZATION_FIXTURES.map((r) => r.id)],
      ["applications", APPLICATION_FIXTURES.map((r) => r.id)],
      ["forms", FORM_FIXTURES.map((r) => r.id)],
      ["competitions", COMPETITION_FIXTURES.map((r) => r.id)],
    ];

    for (const [name, ids] of sets) {
      expect(new Set(ids).size, `duplicate id within ${name}`).toBe(ids.length);
    }
  });
});

describe("model-surface representativeness", () => {
  // These pin the fields a coverage audit (fixtures vs each model's declared
  // properties) originally found demonstrated NOWHERE in the mock. Each is a
  // whole shape a consumer could only learn exists by reading the spec — the
  // playground exists so they can see it instead. If one of these fails after a
  // fixture edit, a model's only exemplar was deleted; restore one rather than
  // deleting the assertion.
  it("demonstrates an award to an individual, not just to organizations", () => {
    const individual = AWARD_FIXTURES.filter(
      (award) => award.recipientIndividual !== undefined,
    );

    expect(individual.length).toBeGreaterThan(0);
    for (const award of individual) {
      // `Fields.Name` requires both halves.
      expect(typeof award.recipientIndividual!.name?.firstName).toBe("string");
      expect(typeof award.recipientIndividual!.name?.lastName).toBe("string");
      // A person-recipient award naming recipient orgs too would demonstrate
      // confusion, not coverage.
      expect(award.recipientOrganizations).toBeUndefined();
    }
  });

  it("puts the FAIN on its base key, with otherIds reserved for extra registries", () => {
    const withFain = AWARD_FIXTURES.filter(
      (award) => award.identifiers?.["awd:us:fain"] !== undefined,
    );

    expect(withFain.length).toBe(AWARD_FIXTURES.length);
    for (const award of withFain) {
      // The base identifier must never ALSO appear under otherIds.
      expect(award.identifiers!.otherIds?.["awd:us:fain"]).toBeUndefined();
    }
    // And otherIds itself is still demonstrated somewhere.
    expect(
      AWARD_FIXTURES.some(
        (award) => Object.keys(award.identifiers?.otherIds ?? {}).length > 0,
      ),
    ).toBe(true);
  });

  it("demonstrates every OrgIds base key, systemId included", () => {
    const has = (
      pick: (org: (typeof ORGANIZATION_FIXTURES)[number]) => unknown,
    ) => ORGANIZATION_FIXTURES.some((org) => pick(org) !== undefined);

    expect(has((org) => org.identifiers?.["org:us:ein"])).toBe(true);
    expect(has((org) => org.identifiers?.["org:us:uei"])).toBe(true);
    expect(has((org) => org.identifiers?.["org:xi:duns"])).toBe(true);
    expect(has((org) => org.identifiers?.systemId)).toBe(true);
    expect(has((org) => org.identifiers?.otherIds)).toBe(true);
  });

  it("keeps every identifier-collection entry consistent with its scalar twin", () => {
    // `ein`/`uei`/`duns` scalars and their collection entries are two views of
    // one fact; a fixture where they disagree teaches consumers the two can.
    const pairs: Array<
      ["ein" | "uei" | "duns", "org:us:ein" | "org:us:uei" | "org:xi:duns"]
    > = [
      ["ein", "org:us:ein"],
      ["uei", "org:us:uei"],
      ["duns", "org:xi:duns"],
    ];

    for (const org of ORGANIZATION_FIXTURES) {
      for (const [scalar, key] of pairs) {
        const entry = org.identifiers?.[key];
        if (org[scalar] !== undefined && entry !== undefined) {
          expect(entry.id, `${org.id} ${key}`).toBe(org[scalar]);
        }
      }
    }
  });

  it("demonstrates allIds with an archived value whose active twin matches id", () => {
    const carriers = ORGANIZATION_FIXTURES.flatMap((org) => [
      org.identifiers?.systemId,
      org.identifiers?.["org:us:ein"],
      org.identifiers?.["org:us:uei"],
      org.identifiers?.["org:xi:duns"],
      ...Object.values(org.identifiers?.otherIds ?? {}),
    ]).filter(
      (identifier): identifier is Identifier & { allIds: IdentifierValue[] } =>
        identifier?.allIds !== undefined,
    );

    expect(carriers.length).toBeGreaterThan(0);
    for (const identifier of carriers) {
      const statuses = identifier.allIds!.map((value) => value.status);
      expect(statuses).toContain("active");
      expect(statuses).toContain("archived");
      // The primary `id` is the active value, never an archived one.
      const active = identifier.allIds!.find((v) => v.status === "active");
      expect(identifier.id).toBe(active!.id);
    }
  });

  it("demonstrates instructions as attached Files on both models that allow them", () => {
    const fileInstructions = (
      records: ReadonlyArray<{ instructions?: unknown }>,
    ) => records.filter((record) => Array.isArray(record.instructions));

    const formCarriers = fileInstructions(FORM_FIXTURES);
    const competitionCarriers = fileInstructions(COMPETITION_FIXTURES);
    expect(formCarriers.length).toBeGreaterThan(0);
    expect(competitionCarriers.length).toBeGreaterThan(0);

    for (const record of [...formCarriers, ...competitionCarriers]) {
      for (const file of record.instructions as Array<
        Record<string, unknown>
      >) {
        // `Fields.File`'s required properties.
        expect(typeof file.downloadUrl).toBe("string");
        expect(typeof file.name).toBe("string");
        expect(typeof file.createdAt).toBe("string");
        expect(typeof file.lastModifiedAt).toBe("string");
      }
    }
    // The prose variant must survive too — both branches of the union.
    expect(FORM_FIXTURES.some((f) => typeof f.instructions === "string")).toBe(
      true,
    );
  });

  it("covers every FormResponseStatus value across the nested responses", () => {
    const responses = APPLICATION_FIXTURES.flatMap((application) =>
      Object.values(application.formResponses),
    );
    const values = new Set(responses.map((response) => response.status.value));

    for (const status of ["notStarted", "inProgress", "complete", "custom"]) {
      expect(values, `no form response carries status "${status}"`).toContain(
        status,
      );
    }
    // notStarted means not started: an empty response and no attachments.
    for (const response of responses) {
      if (response.status.value === "notStarted") {
        expect(Object.keys(response.response)).toHaveLength(0);
        expect(response.customFields).toBeUndefined();
      }
      if (response.status.value === "custom") {
        expect(typeof response.status.customValue).toBe("string");
      }
    }
  });

  it("demonstrates customFields on a nested form response", () => {
    const carriers = APPLICATION_FIXTURES.flatMap((application) =>
      Object.values(application.formResponses),
    ).filter((response) => response.customFields !== undefined);

    expect(carriers.length).toBeGreaterThan(0);
  });
});
