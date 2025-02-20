import "@typespec/http";

import "./error.tsp";
import "./success.tsp";

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
namespace CommonGrants.Responses;
