import "../models/index.tsp";
import "../responses/index.tsp";

// Define the top-level namespace for CommonGrants routes
namespace CommonGrants.Routes;

// Expose the contents of the Http and Rest namespaces
// these include the decorators @route, @get, etc.
using TypeSpec.Http;
using TypeSpec.Rest;
using Responses;

model PaginatedQuery {
  /** The page to return */
  @query
  @pageIndex
  page?: int32 = 1;

  /** The number of items to return per page */
  @query
  @pageSize
  perPage?: int32 = 100;
}

/** A re-usable interface for an Opportunities router
 *
 * To implement this interface, we recommend declaring a namespace,
 * instantiating the router using `alias` (instead of `extends`),
 * and decorating the namespace with `@route` and `@tag` since they aren't
 * inherited directly from the interface.
 *
 * For more information, see
 * [TypeSpec docs](https://typespec.io/docs/language-basics/interfaces/#templating-interface-operations)
 *
 * @example Using the the default type for the list operation and
 * a custom model for the read operation:
 * ```typespec
 * using TypeSpec.Http;
 *
 * @tag("Search")
 * @route("/opportunities/")
 * namespace Opportunities {
 * alias Router = Routes.Opportunities
 *
 * op list is Router.list;
 * op read is Router.read<CustomOpportunity>;
 *
 * }
 * ```
 */
interface Opportunities {
  /** `GET /opportunities/` Get a paginated list of opportunities
   *
   * @template T Type of the paginated response model.
   * Must be an extension of Models.OpportunityBase. Default is Models.OpportunityBase.
   */
  @summary("List opportunities")
  @doc("Get a paginated list of opportunities, sorted by `lastModifiedAt` with most recent first.")
  @list
  list<T extends Models.OpportunityBase = Models.OpportunityBase>(
    ...PaginatedQuery,
  ): Success.Paginated<T> | Error.Unauthorized;

  /** `GET /opportunities/<id>` View opportunity details
   *
   * @template T Type of the response model.
   * Must be an extension of Models.OpportunityBase. Default is Models.OpportunityBase.
   */
  @summary("View opportunity")
  @doc("View additional details about an opportunity")
  @get
  read<T extends Models.OpportunityBase = Models.OpportunityBase>(
    @path id: Models.uuid,
  ): Success.Ok<T> | Error.NotFound | Error.Unauthorized;
}
