import "./custom-field.tsp";
import "./metadata.tsp";
import "./money.tsp";
import "./event.tsp";

/** A standard set of fields, e.g. `money` that can be reused across models
 *
 * @example How to use the `Fields` namespace
 *
 * ```tsp
 * import "@common-grants/core";
 *
 * using CommonGrants; // exposes the Fields namespace
 *
 * model MyModel {
 *   amount: Fields.money;
 * }
 * ```
 */
namespace CommonGrants.Fields;
