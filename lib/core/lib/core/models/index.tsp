import "@typespec/json-schema";

// Import individual schemas to provide a consistent interface
// and make them available throughout the namespace
import "./opportunity/index.tsp";
import "./organization.tsp";
import "./person.tsp";
import "./proposal.tsp";
import "./application.tsp";
import "./competition.tsp";
import "./form.tsp";
import "./form-response.tsp";

using TypeSpec.JsonSchema;

/** A collection of models for the CommonGrants API
 *
 * @example How to use the `Models` namespace
 *
 * ```typespec
 * import "@common-grants/core";
 *
 * using CommonGrants; // exposes the Models namespace
 *
 * model MyModel extends Models.OpportunityBase {}
 * ```
 */
@jsonSchema // and emit these Schemas as JSON schemas
namespace CommonGrants.Models;
