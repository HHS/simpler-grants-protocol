// Import the JS entry point for this library
// For more details see:
// https://typespec.io/docs/extending-typespec/basics/#h-add-your-main-typespec-file
import "../dist/src/index.js";

// Import items from the Core namespace to make them available outside the package
import "./core/index.tsp";
import "./api.tsp";

namespace CommonGrants;

/** Base data types, e.g. `uuid` and `isoDate`, used to build more complex fields and models
 *
 * @example How to use the `Types` namespace
 *
 * ```tsp
 * import "@common-grants/core";
 *
 * using CommonGrants; // exposes the Types namespace
 *
 * model MyModel {
 *   id: Types.uuid;
 *   createdAt: Types.isoDate;
 * }
 * ```
 */
alias Types = Core.Types;

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
alias Fields = Core.Fields;

/** A standardized set of response schemas for CommonGrants API routes
 *
 * @example How to use the `Responses` namespace
 *
 * ```tsp
 * import "@typespec/http";
 * import "@common-grants/core";
 *
 * using CommonGrants; // exposes the Responses namespace
 * using TypeSpec.Http;
 *
 * @route("/pets")
 * namespace Pets {
 *   @get
 *   getPets(): Responses.Ok<Pet> | Responses.Unauthorized;
 * }
 * ```
 */
alias Responses = Core.Responses;

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
alias Models = Core.Models;

/** A series of routing interfaces for CommonGrants API endpoints
 *
 * @example How to use the `Routes` namespace
 *
 * ```tsp
 * import "@common-grants/core";
 *
 * using CommonGrants; // exposes the Routes namespace
 *
 * namespace MyRoutes {
 *   alias OpportunityRouter = Routes.Opportunities;
 *
 *   op List is OpportunityRouter.list;
 * }
 */
alias Routes = Core.Routes;
