// Import the JS entry point for this library
// For more details see:
// https://typespec.io/docs/extending-typespec/basics/#h-add-your-main-typespec-file
import "../dist/src/index.js";

// Import Schemas and Routes to make them available outside the package
import "./schemas/index.tsp";
import "./routes/index.tsp";
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
alias Types = CommonGrants.Schemas.Types;

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
alias Fields = CommonGrants.Schemas.Fields;

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
alias Responses = CommonGrants.Routes.Responses;
