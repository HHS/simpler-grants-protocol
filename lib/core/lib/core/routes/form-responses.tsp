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
interface FormResponses {
  // ###############################
  // Update form response
  // ###############################

  @summary("Respond to a form")
  @doc("Set or update the response to a given form in an application.")
  @put
  @route("/{appId}/forms/{formId}")
  setFormResponse(
    /** The ID of the application to whose form response is being updated */
    @path appId: Types.uuid,

    /** The ID of the form whose response is being updated */
    @path formId: Types.uuid,

    /** The response to the form */
    @body response: Record<unknown>,
  ): Responses.Ok<Models.AppFormResponse>;

  // ###############################
  // Get form response
  // ###############################

  @summary("Get a form response")
  @doc("Get the response to a given form in an application.")
  @get
  @route("/{appId}/forms/{formId}")
  getFormResponse(
    /** The ID of the application to whose form response is being retrieved */
    @path appId: Types.uuid,

    /** The ID of the form whose response is being retrieved */
    @path formId: Types.uuid,
  ): Responses.Ok<Models.AppFormResponse>;
}
