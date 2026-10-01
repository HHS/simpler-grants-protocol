import "./status.tsp";
import "./funding.tsp";
import "./timeline.tsp";
import "../../fields/index.tsp";
import "../../types.tsp";

namespace CommonGrants.Models;

using Fields;
using Types;

// ########################################
// Model definition
// ########################################

/** The base model for a funding opportunity.
 *
 * It supports customization by extending the `customFields` property.
 *
 * @example How to declare a new Opportunity model with custom fields
 *
 * ```typespec
 * using CommonGrants.Fields;
 * using CommonGrants.Models;
 *
 * model Agency extends CustomField {
 *   fieldType: CustomFieldType.string;
 *
 *   @example("Department of Transportation")
 *   value: string;
 * }
 *
 * model NewFields extends CustomFieldMap {
 *   agency: Agency;
 * }
 *
 * model CustomOpportunity extends OpportunityBase {
 *   customFields: NewFields;
 * }
 * ```
 */
@doc("A funding opportunity")
@Versioning.added(CommonGrants.Versions.v0_1)
model OpportunityBase {
  // Identity fields shared with the OppRef reference model
  ...OppRef;

  /** Status of the opportunity */
  status: OppStatus;

  /** Description of the opportunity's purpose and scope */
  @example("This program provides funding to small businesses to help them grow and create jobs")
  description: string;

  /** Details about the funding available */
  funding?: OppFunding;

  /** Key dates for the opportunity, such as when the application opens and closes */
  keyDates?: OppTimeline;

  /** The type of applicant for the opportunity */
  @Versioning.added(CommonGrants.Versions.v0_2)
  acceptedApplicantTypes?: ApplicantType[];

  /** URL for the original source of the opportunity */
  source?: url;

  /** Additional custom fields specific to this opportunity */
  customFields?: Record<CustomField>;

  // Spreads the fields from the Metadata model into the Opportunity model
  ...SystemMetadata;
}

// ########################################
// Opportunity identifiers
// ########################################

/** An opportunity's Federal Opportunity Number (FON), assigned by the awarding agency. */
@example(Examples.Opportunity.fon)
@Versioning.added(CommonGrants.Versions.v0_5)
model OppIdFon is Fields.IdentifierT<string, "opp:us:fon">;

/** An opportunity's Assistance Listing Number (ALN), formerly the CFDA number. */
@example(Examples.Opportunity.aln)
@Versioning.added(CommonGrants.Versions.v0_5)
model OppIdAln is Fields.IdentifierT<string, "opp:us:aln">;

/** A collection of identifiers associated with an opportunity.
 *
 * Extends the generic identifier collection with the base identifiers CommonGrants
 * defines for opportunities. Additional registries can be published under `otherIds`.
 */
@example(Examples.Opportunity.identifiers)
@Versioning.added(CommonGrants.Versions.v0_5)
model OppIds extends Fields.IdentifierCollection {
  /** The opportunity's Federal Opportunity Number (FON). */
  `opp:us:fon`?: OppIdFon;

  /** The opportunity's Assistance Listing Number (ALN). */
  `opp:us:aln`?: OppIdAln;
}

// ########################################
// Opportunity reference
// ########################################

/** A reference to an opportunity, previewing the key fields a consumer needs
 * to identify it and look it up or join it to another response. Appears
 * wherever another record points to an opportunity, such as the opportunity
 * an award resulted from.
 */
@example(Examples.Opportunity.ref)
@Versioning.added(CommonGrants.Versions.v0_1)
model OppRef {
  /** Globally unique id for the opportunity */
  @visibility(Lifecycle.Read)
  id: uuid;

  /** Title or name of the funding opportunity */
  @example("Small business grant program")
  title: string;

  /** System and registry-specific identifiers for the opportunity */
  @Versioning.added(CommonGrants.Versions.v0_5)
  identifiers?: OppIds;
}

// ########################################
// Opportunity details
// ########################################

/** A funding opportunity with additional details, like available competitions. */
@Versioning.added(CommonGrants.Versions.v0_2)
model OpportunityDetails extends OpportunityBase {
  /** The competitions associated with the opportunity */
  competitions?: CompetitionBase[];
}

// ########################################
// Model examples
// ########################################

/** Examples of the opportunity identifier and reference models */
namespace Examples.Opportunity {
  const fon = #{
    registry: #{
      code: "opp:us:fon",
      url: "https://commongrants.org/registries/opp-us-fon",
    },
    id: "HHS-2026-ACF-OCC-YD-0001",
  };

  const aln = #{
    registry: #{
      code: "opp:us:aln",
      url: "https://commongrants.org/registries/opp-us-aln",
    },
    id: "93.575",
  };

  const identifiers = #{
    systemId: #{
      registry: #{ code: "opp:grants.gov:system" },
      id: "018f2e77-3a4b-7c1d-9e2f-abcdef123456",
    },
    `opp:us:fon`: fon,
    `opp:us:aln`: aln,
  };

  // Deliberately without `identifiers`. The emitter does not project `@example`
  // values per version (see `OrgRef`, whose v0.2/v0.3 schemas show the v0.4
  // `identifiers` field in `examples` but not in `properties`), so adding it
  // here would surface a v0.5 field in the v0.1-v0.4 `OppRef` examples.
  const ref = #{
    id: "018f2e77-3a4b-7c1d-9e2f-abcdef123456",
    title: "Health Center Capital Improvement Program",
  };
}
