import "@typespec/json-schema";

// Import individual schemas to provide a consistent interface
// and make them available throughout the namespace
import "./opportunity/index.tsp";

using TypeSpec.JsonSchema;

/** Namespace for Core that can be used in API routes */
@jsonSchema // and emit these Schemas.as JSON schemas
namespace Core.Models;

/** The base model for a funding opportunity.
 *
 * It supports customization by extending the `customFields` property.
 *
 * @example How to declare a new Opportunity model with custom fields
 *
 * ```typespec
 * using Core.Fields;
 * using Core.Models;
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
