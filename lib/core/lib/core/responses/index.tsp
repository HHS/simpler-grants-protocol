import "@typespec/http";

import "./error.tsp";
import "./success.tsp";
import "./version-errors.tsp";

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
 *   op getPets(): Responses.OkT<Pet> | Responses.Unauthorized;
 * }
 * ```
 *
 * @example How to add the version errors to a protocol route
 *
 * ```typespec
 * @route("/common-grants/opportunities")
 * @get
 * op listOpportunities(
 *   ...Pagination.PaginatedQueryParams,
 *   ...Headers.VersionRequest,
 * ): Responses.WithVersionErrors<Responses.PaginatedT<Models.OpportunityBase>>;
 * ```
 */
@jsonSchema
namespace CommonGrants.Responses;
