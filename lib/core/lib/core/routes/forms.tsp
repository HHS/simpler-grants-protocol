import "../responses/index.tsp";

// Define the top-level namespace for CommonGrants routes
namespace CommonGrants.Routes;

// Expose the contents of the Http and Rest namespaces
// these include the decorators @route, @get, etc.
using TypeSpec.Http;

/** A re-usable interface for an Applications router
 *
 * To implement this interface, we recommend declaring a namespace,
 * instantiating the router using `alias` (instead of `extends`),
 * and decorating the namespace with `@route` and `@tag` since they aren't
 * inherited directly from the interface.
 */
interface Forms {
  // ###############################
  // Update form response
  // ###############################

  @summary("List forms")
  @doc("Get a paginated list of forms, sorted by `lastModifiedAt` with most recent first.")
  @get
  list(
    ...Pagination.PaginatedQueryParams,
  ): Responses.Paginated<Models.FormBase>;

  // ###############################
  // View form details
  // ###############################

  @summary("View form details")
  @doc("View details about a given form.")
  @get
  read(
    /** The ID of the form to view */
    @path formId: Types.uuid,
  ): Responses.Ok<Models.FormBase>;
}
