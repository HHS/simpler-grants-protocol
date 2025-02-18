import "@typespec/json-schema";

// Import individual Schemas.to provide a consistent interface
// and make them available throughout the namespace
import "./types.tsp";
import "./fields/index.tsp";
import "./opportunity/index.tsp";

using TypeSpec.JsonSchema;

/** Namespace for CommonGrants.Schemas that can be used in API routes */
@jsonSchema // and emit these Schemas.as JSON schemas
namespace CommonGrants.Schemas;

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
