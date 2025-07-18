import "../responses/index.tsp";

// Define the top-level namespace for CommonGrants routes
namespace CommonGrants.Routes;

// Expose the contents of the Http and Rest namespaces
// these include the decorators @route, @get, etc.
using TypeSpec.Http;

/** A re-usable interface for a Competitions router
 *
 * To implement this interface, we recommend declaring a namespace,
 * instantiating the router using `alias` (instead of `extends`),
 * and decorating the namespace with `@route` and `@tag` since they aren't
 * inherited directly from the interface.
 */
interface Competitions {
  // ###############################
  // View competition details
  // ###############################

  /** View details about a competition for a given funding opportunity.
   *
   * Each competition may have a distinct set of forms, be limited to a
   * certain types of applicants, or have a different application period.
   */
  @summary("View competition details")
  @get
  @route("/{compId}")
  read(
    /** The ID of the competition to get */
    @path compId: Types.uuid,
  ): Responses.Ok<Models.CompetitionBase> | Responses.NotFound;

  // ###############################
  // Apply to a competition
  // ###############################

  @summary("Apply to a competition")
  @doc("Apply to a given competition with all of the required information")
  @post
  @route("/{compId}/apply")
  apply(
    /** The ID of the competition to apply to */
    @path compId: Types.uuid,

    /** The application to apply to the competition */
    @body application: Models.ApplicationBase,
  ): Responses.Created<Models.ApplicationBase> | Responses.NotFound | Responses.Unauthorized;
}
