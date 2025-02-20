import "@typespec/json-schema";

// Import individual schemas to provide a consistent interface
// and make them available throughout the namespace
import "./opportunity/index.tsp";

using TypeSpec.JsonSchema;

/** A collection of models for the CommonGrants API
 *
 * @example How to use the `Models` namespace
 *
 * ```tsp
 * import "@common-grants/core";
 *
 * using CommonGrants; // exposes the Models namespace
 *
 * model MyModel extends Models.OpportunityBase {}
 * ```
 */
@jsonSchema // and emit these Schemas.as JSON schemas
namespace CommonGrants.Models;

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
alias OpportunityBase = Opportunity.OpportunityBase;
