import "@typespec/http";
import "@typespec/rest";

// Import individual route files to provide a consistent interface
import "./opportunities.tsp";

/** A series of routing interfaces for CommonGrants API endpoints
 *
 * @example How to use the `Routes` namespace
 *
 * ```tsp
 * import "@common-grants/core";
 *
 * using CommonGrants; // exposes the Routes namespace
 *
 * namespace MyRoutes {
 *   alias OpportunityRouter = Routes.Opportunities;
 *
 *   op List is OpportunityRouter.list;
 * }
 */
namespace CommonGrants.Routes;
