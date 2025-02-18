import "@typespec/http";
import "@typespec/rest";

// Import individual route files to provide a consistent interface
import "./opportunities.tsp";

/** A series of interfaces for CommonGrants API routes
 *
 * @example How to use the `Routes` namespace
 *
 * ```tsp
 * import "@common-grants/core";
 *
 * using CommonGrants;
 *
 * namespace MyRoutes {
 *   alias OpportunityRouter = Routes.Opportunities;
 *
 *   op List is OpportunityRouter.list;
 * }
 * ```
 */
namespace Core.Routes;
