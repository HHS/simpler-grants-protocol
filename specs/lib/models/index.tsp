import "@typespec/json-schema";

// Import individual models to provide a consistent interface
// and make them available throughout the namespace
import "./base.tsp";
import "./custom-field.tsp";
import "./money.tsp";
import "./event.tsp";
import "./metadata.tsp";
import "./custom-enum.tsp";
import "./opportunity/base.tsp";

using TypeSpec.JsonSchema;

// Define the top-level namespace for the models
// and emit these models as JSON schemas
@jsonSchema
namespace CommonGrants.Models;

/** The base model for a funding opportunity.
 *
 * It supports customization by extending the `customFields` property.
 *
 * @example How to declare a new Opportunity model with custom fields
 *
 * ```typespec
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
alias OpportunityBase = Opportunity.OpportunityBase;
