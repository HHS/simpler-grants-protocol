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
interface Applications {
  // ##############################
  // Start an application
  // ##############################

  @summary("Start an application")
  @doc("Start a new application for a given competition.")
  @post
  @route("/start")
  startApplication(
    /** The ID of the competition to start an application for */
    competitionId: Types.uuid,

    /** The ID of the organization to start an application for, if applying on behalf of an organization */
    organizationId?: Types.uuid,

    /** The name of the application */
    name: string,
  ): Responses.Created<Models.ApplicationBase> | Responses.Unauthorized;

  // ###############################
  // Get an application
  // ###############################

  @summary("View an application")
  @doc("View an application for a given competition, along with its form responses and validation errors.")
  @get
  @route("/{appId}")
  getApplication(
    /** The ID of the application to get */
    @path appId: Types.uuid,
  ): Responses.Ok<Models.ApplicationBase> | Responses.NotFound | Responses.Unauthorized;

  // ###############################
  // Submit an application
  // ###############################

  @summary("Submit an application")
  @doc("Submit an application to a competition. Applications that have validation errors will be blocked from submitting until the errors are fixed.")
  @put
  @route("/{appId}/submit")
  submitApplication(
    /** The ID of the application to submit */
    @path appId: Types.uuid,
  ):
    | Responses.Ok<unknown>
    | Responses.ApplicationSubmissionError
    | Responses.NotFound
    | Responses.Unauthorized;

  // ###############################
  // Search applications
  // ###############################

  @summary("Search applications")
  @doc("Search for applications. Note: The search results for a given query will depend on the scopes attached to the API token used to make the request.")
  @get
  @route("/search")
  searchApplications(
    /** The filters to apply to the search */
    @query filters: Models.AppFilters,

    /** The sorting to apply to the search */
    @query sorting: Models.AppSorting,
  ): Responses.Filtered<Models.ApplicationBase, Models.AppFilters>;
}
