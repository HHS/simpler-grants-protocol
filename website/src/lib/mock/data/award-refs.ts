/**
 * One `AwdRef` per award fixture: the id, title, and identifiers that identify
 * an award wherever something points at it.
 *
 * Three places need the same reference, and before this module existed each
 * kept its own copy: the award's own fixture in `awards.ts`, the `awards` list
 * on the opportunity that produced it in `fixtures.ts`, and the `parent` of the
 * amendment award. A renamed title had to be edited in all three, and nothing
 * but a test caught a miss. Declaring each reference once here makes that drift
 * impossible, and demotes the cross-resource comparison to a backstop.
 *
 * It lives in its own module because `fixtures.ts` cannot import `awards.ts` at
 * runtime without closing an import cycle: `AWARD_FIXTURES` reads
 * `OPPORTUNITY_FIXTURES` while its own module is evaluating. The only import
 * from `awards.ts` here is type-only, so it is erased at build time and this
 * module keeps `./ids` as its single runtime dependency.
 *
 * Each constant is shared by reference rather than copied. Nothing in the mock
 * mutates a nested reference (every shaper copies before it deletes), so one
 * frozen-by-convention object can appear in several records at once.
 */

import type { AwdIds, AwdRef } from "./awards";
import { CANONICAL_RECORD_ID } from "./ids";

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

/**
 * The canonical award aliases the shared canonical id, so the record Swagger's
 * pre-filled "Try it out" resolves to carries the same uuid as the opportunity
 * that produced it.
 */
export const CANONICAL_AWARD_REF: AwdRef = {
  id: CANONICAL_RECORD_ID,
  title: "Community Health Center Capital Improvement Grant",
  identifiers: fain("H80CS00001", "01912a8b-7c3d-7894-abcd-ef1234567890"),
};

/** The award the spec's `AwardBase` example publishes. */
export const DOCUMENTED_AWARD_REF: AwdRef = {
  id: "01912a8b-7c3d-7894-abcd-ef1234567890",
  title: "Rural Health Clinic Modernization Award",
  identifiers: fain("H80CS00002", "01912a8b-7c3d-7894-abcd-ef1234567891"),
};

export const CLEAN_ENERGY_AWARD_REF: AwdRef = {
  id: "aa1b2c3d-4e5f-4061-8a7b-8c9d0e1f2032",
  title: "Clean Energy Innovation Demonstration Award",
  identifiers: fain("DE0000101", "01912a8b-7c3d-7894-abcd-ef1234567892"),
};

/** An amendment to `CLEAN_ENERGY_AWARD_REF`, which it names as its `parent`. */
export const CLEAN_ENERGY_AMENDMENT_AWARD_REF: AwdRef = {
  id: "dd4e5f60-7182-4394-8d0e-1f2031425365",
  title: "Clean Energy Innovation Demonstration Award — Amendment 1",
  identifiers: fain("DE0000101-A1", "01912a8b-7c3d-7894-abcd-ef1234567895"),
};

export const RURAL_BROADBAND_AWARD_REF: AwdRef = {
  id: "bb2c3d4e-5f60-4172-8b8c-9d0e1f203143",
  title: "Rural Broadband Expansion Planning Award",
  identifiers: fain("RUS0000045", "01912a8b-7c3d-7894-abcd-ef1234567893"),
};

/** The one award carrying an `otherIds` registry the model does not define. */
export const WORKFORCE_APPRENTICESHIP_AWARD_REF: AwdRef = {
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
};

export const ARTS_CULTURE_AWARD_REF: AwdRef = {
  id: "ee5f6071-8293-44a5-8e1f-2031425364a5",
  title: "Arts & Culture Preservation Award",
  identifiers: fain("NEA0000772", "01912a8b-7c3d-7894-abcd-ef1234567896"),
};

export const COASTAL_RESILIENCE_AWARD_REF: AwdRef = {
  id: "ff607182-93a4-45b6-8f20-31425364a5b6",
  title: "Coastal Resilience Planning Award",
  identifiers: fain("NOAA0000914", "01912a8b-7c3d-7894-abcd-ef1234567897"),
};

export const HEALTH_OUTREACH_AWARD_REF: AwdRef = {
  id: "01718293-a4b5-46c7-9031-425364a5b6c7",
  title: "Community Health Outreach Continuation Award",
  identifiers: fain("H80CS00003", "01912a8b-7c3d-7894-abcd-ef1234567898"),
};

export const CIVIC_TECH_AWARD_REF: AwdRef = {
  id: "23293a4b-c6d7-48e9-9253-64a5b6c7d8e9",
  title: "Civic Tech Fellowship Award — Cohort 4",
  identifiers: fain("CTF0000104", "01912a8b-7c3d-7894-abcd-ef1234567900"),
};

export const DIGITAL_LITERACY_AWARD_REF: AwdRef = {
  id: "1218293a-b5c6-47d8-9142-5364a5b6c7d8",
  title: "Digital Literacy for Seniors Award",
  identifiers: fain("IMLS0000205", "01912a8b-7c3d-7894-abcd-ef1234567899"),
};
