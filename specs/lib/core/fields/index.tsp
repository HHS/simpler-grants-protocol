import "./custom-field.tsp";
import "./metadata.tsp";
import "./money.tsp";
import "./event.tsp";
import "./address.tsp";
import "./name.tsp";
import "./phone.tsp";
import "./pcs.tsp";
import "./email.tsp";

using TypeSpec.JsonSchema;

/** A standard set of fields, e.g. `money` that can be reused across models
 *
 * @example How to use the `Fields` namespace
 *
 * ```typespec
 * import "@common-grants/core";
 *
 * using CommonGrants; // exposes the Fields namespace
 *
 * model MyModel {
 *   amount: Fields.money;
 * }
 * ```
 */
@jsonSchema
namespace CommonGrants.Fields;
