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

/** Examples of the OppRef model */
namespace Examples.Opportunity {
  const ref = #{
    id: "018f2e77-3a4b-7c1d-9e2f-abcdef123456",
    title: "Health Center Capital Improvement Program",
  };
}
