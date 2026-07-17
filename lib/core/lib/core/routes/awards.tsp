import "../models/index.tsp";
import "../responses/index.tsp";
import "../pagination.tsp";

// Define the top-level namespace for CommonGrants routes
namespace CommonGrants.Routes;

// Expose the contents of the Http and Rest namespaces
// these include the decorators @route, @get, etc.
using TypeSpec.Http;
using TypeSpec.Versioning;

/** A re-usable interface for an Awards router
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
 * @tag("Awards")
 * @route("/awards/")
 * namespace Awards {
 *   alias Router = Routes.Awards
 *
 *   op list is Router.list;
 *   op read is Router.read<CustomAward>;
 * }
 * ```
 */
@added(CommonGrants.Versions.v0_4)
interface Awards {
  // ###############################
  // List awards
  // ###############################

  /** `GET /awards/` Get a paginated list of awards
   *
   * @template T Type of the paginated response model.
   * Must be an extension of Models.AwardBase. Default is Models.AwardBase.
   */
  @summary("List awards")
  @doc("Get a paginated list of awards, sorted by `lastModifiedAt` with most recent first.")
  @list
  list<T extends Models.AwardBase = Models.AwardBase>(
    ...Pagination.PaginatedQueryParams,
  ): Responses.Paginated<T>;

  // ##############################
  // View an award
  // ##############################

  /** `GET /awards/<id>` View award details
   *
   * @template T Type of the response model.
   * Must be an extension of Models.AwardBase. Default is Models.AwardBase.
   */
  @summary("View award details")
  @doc("View details about an award.")
  @get
  read<T extends Models.AwardBase = Models.AwardBase>(
    /** The ID of the award to view */
    @path
    awdId: Types.uuid,
  ): Responses.Ok<T> | Responses.NotFound;

  // ###############################
  // Search awards
  // ###############################

  /** `POST /awards/search` Search awards
   *
   * @template T Type of the response model.
   * Must be an extension of Models.AwardBase. Default is Models.AwardBase.
   */
  @summary("Search awards")
  @doc("Search for awards based on the provided filters.")
  @post
  @route("/search")
  search<T extends Models.AwardBase = Models.AwardBase>(
    /** Award search query */
    @example("Community health center")
    search?: string,

    /** Filters to apply to the award search
     *
     * Multiple filter conditions will be combined with AND logic, so that
     * results only include awards that match all of the provided filters.
     */
    filters?: Models.AwdFilters,

    /** The sort order to apply to the results */
    sorting?: Models.AwdSorting,

    /** Pagination instructions for the results */
    pagination?: Pagination.PaginatedBodyParams,
  ): Responses.Filtered<T, Models.AwdFilters>;
}
