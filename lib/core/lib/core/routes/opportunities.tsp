import "../models/index.tsp";
import "../responses/index.tsp";
import "../pagination.tsp";

// Define the top-level namespace for CommonGrants routes
namespace CommonGrants.Routes;

// Expose the contents of the Http and Rest namespaces
// these include the decorators @route, @get, etc.
using TypeSpec.Http;
using TypeSpec.Versioning;

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
 * @example Using the default type for the list operation and
 * a custom model for the read operation:
 * ```typespec
 * using TypeSpec.Http;
 *
 * @tag("Opportunities")
 * @route("/opportunities/")
 * namespace Opportunities {
 *   alias Router = Routes.Opportunities
 *
 *   op list is Router.list;
 *   op read is Router.read<CustomOpportunity>;
 * }
 * ```
 */
interface Opportunities {
  // ###############################
  // List opportunities
  // ###############################

  /** `GET /opportunities/` Get a paginated list of opportunities
   *
   * @template T Type of the paginated response model.
   * Must be an extension of Schemas.OpportunityBase. Default is Schemas.OpportunityBase.
   */
  @summary("List opportunities")
  @doc("Get a paginated list of opportunities, sorted by `lastModifiedAt` with most recent first.")
  @list
  list<T extends Models.OpportunityBase = Models.OpportunityBase>(
    ...Pagination.PaginatedQueryParams,
  ): Responses.Paginated<T>;

  // ##############################
  // View an opportunity (v0.1.0)
  // ##############################

  /** `GET /opportunities/<id>` View opportunity details
   *
   * @template T Type of the response model.
   * Must be an extension of Schemas.OpportunityBase. Default is Schemas.OpportunityBase.
   */
  @summary("View opportunity details")
  @doc("View additional details about an opportunity")
  @get
  read<T extends Models.OpportunityBase = Models.OpportunityDetails>(
    /** The ID of the opportunity to view */
    @path
    @removed(Versions.v0_2)
    id: Types.uuid,

    /** The ID of the opportunity to view */
    @path
    @added(Versions.v0_2)
    oppId: Types.uuid,
  ): Responses.Ok<T> | Responses.NotFound;

  // ###############################
  // Search opportunities
  // ###############################

  /** `POST /opportunities/search` Search opportunities
   *
   * @template T Type of the response model.
   * Must be an extension of Schemas.OpportunityBase. Default is Schemas.OpportunityBase.
   */
  @summary("Search opportunities")
  @doc("Search for opportunities based on the provided filters")
  @post
  @route("/search")
  search<T extends Models.OpportunityBase = Models.OpportunityBase>(
    /** Opportunity search query */
    @example("Pre-school education")
    search?: string,

    /** Filters to apply to the opportunity search
     *
     * Multiple filter conditions will be combined with AND logic, so that
     * results only include opportunities that match all of the provided filters.
     */
    filters?: Models.OppFilters,

    /** The sort order to apply to the results */
    sorting?: Models.OppSorting,

    /** Pagination instructions for the results */
    pagination?: Pagination.PaginatedBodyParams,
  ): Responses.Filtered<T, Models.OppFilters>;
}
