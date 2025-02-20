import "./status.tsp";
import "./funding.tsp";
import "./timeline.tsp";
import "../../fields/index.tsp";
import "../../types.tsp";

/** Namespace for Core that are specific to funding opportunities */
namespace CommonGrants.Models;

using CommonGrants.Fields;
using CommonGrants.Types;

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
 *   type: CustomFieldType.string;
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
@doc("A funding opportunity") // Overrides internal docstrings when emitting OpenAPI
model OpportunityBase {
  /** Globally unique id for the opportunity */
  @visibility(Lifecycle.Read)
  id: uuid;

  /** Title or name of the funding opportunity */
  title: string;

  /** Status of the opportunity */
  status: OppStatus;

  /** Description of the opportunity's purpose and scope */
  description: string;

  /** Details about the funding available */
  fundingDetails: OppFunding;

  /** Key dates for the opportunity, such as when the application opens and closes */
  keyDates: OppTimeline;

  /** URL for the original source of the opportunity */
  source?: url;

  /** Additional custom fields specific to this opportunity */
  customFields?: Record<CustomField>;

  // Spreads the fields from the Metadata model into the Opportunity model
  ...SystemMetadata;
}
