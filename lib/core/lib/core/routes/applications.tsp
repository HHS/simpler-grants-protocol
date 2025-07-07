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
  @doc("Start a draft application for a given competition")
  @post
  @route("/start")
  startApplication(): Responses.Ok<unknown>;

  // ###############################
  // Get an application
  // ###############################

  @summary("Get an application")
  @doc("Get an application for a given competition with draft form responses")
  @get
  @route("/{id}")
  getApplication(
    /** The ID of the application to get */
    @path id: Types.uuid,
  ): Responses.Ok<unknown>;

  // ###############################
  // Submit an application
  // ###############################

  @summary("Submit an application")
  @doc("Submit an application for a given competition")
  @post
  @route("/{id}/submit")
  submitApplication(
    /** The ID of the application to submit */
    @path id: Types.uuid,
  ): Responses.Ok<unknown>;
}
