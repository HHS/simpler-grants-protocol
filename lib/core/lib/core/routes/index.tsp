import "@typespec/http";
import "@typespec/rest";

// Import individual route files to provide a consistent interface
import "./opportunities.tsp";
import "./applications.tsp";
import "./form-responses.tsp";
import "./competitions.tsp";

/** A series of routing interfaces for CommonGrants API endpoints
 *
 * @example How to use the `Routes` namespace
 *
 * ```typespec
 * import "@common-grants/core";
 *
 * using CommonGrants; // exposes the Routes namespace
 *
 * namespace MyRoutes {
 *   alias OpportunityRouter = Routes.Opportunities;
 *
 *   op list is OpportunityRouter.list;
 * }
 */
namespace CommonGrants.Routes;
