import "@typespec/http";
import "@typespec/json-schema";

import "./error.tsp";
import "./success.tsp";

using TypeSpec.JsonSchema;

/** A standardized set of response schemas for CommonGrants API routes
 *
 * @example How to use the `Responses` namespace
 *
 * ```typespec
 * import "@typespec/http";
 * import "@common-grants/core";
 *
 * using CommonGrants; // exposes the Responses namespace
 * using TypeSpec.Http;
 *
 * @route("/pets")
 * namespace Pets {
 *   @get
 *   op getPets(): Responses.Ok<Pet> | Responses.Unauthorized;
 * }
 * ```
 */
@jsonSchema
namespace CommonGrants.Responses;
