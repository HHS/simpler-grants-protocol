// Import Schemas.and Routes to make them available outside the package
import "./core/index.tsp";
import "@typespec/http";
import "@typespec/openapi";

using TypeSpec.Http;
using TypeSpec.OpenAPI;

/** The base OpenAPI specification for a CommonGrants API
 *
 * In order for an API to be "compliant" with the CommonGrants protocol,
 * it must implement all of the routes with the "required" tag in this specification.
 */
@service(#{ title: "CommonGrants Base API" })
@tagMetadata(
  "experimental",
  #{
    description: "Endpoints that MAY be implemented by CommonGrants APIs, but are not guaranteed to be stable",
  }
)
@tagMetadata(
  "optional",
  #{ description: "Endpoints that MAY be implemented by CommonGrants APIs" }
)
@tagMetadata(
  "required",
  #{
    description: "Endpoints that MUST be implemented by all CommonGrants APIs",
  }
)
@tagMetadata(
  "Applications",
  #{ description: "Endpoints related to applications" }
)
@tagMetadata(
  "Opportunities",
  #{ description: "Endpoints related to funding opportunities" }
)
namespace CommonGrants.API;

// #########################################################
// Opportunities
// #########################################################

@tag("Opportunities")
@route("/common-grants/opportunities")
namespace Opportunities {
  alias Router = Routes.Opportunities;

  @tag("required")
  op list is Router.list;

  @tag("required")
  op read is Router.read;

  @tag("optional")
  op search is Router.search;
}

// #########################################################
// Applications
// #########################################################

@tag("Applications")
@tag("experimental")
@route("/common-grants/")
namespace Apply {
  // #########################################################
  // Multi-step workflow
  // #########################################################

  @route("/applications")
  namespace MultiStepWorkflow {
    alias ApplicationRouter = Routes.Applications;
    alias FormResponseRouter = Routes.FormResponses;

    // Start an application workflow
    op startApplication is ApplicationRouter.startApplication;
    op getApplication is ApplicationRouter.getApplication;

    // Update form responses
    op setFormResponse is FormResponseRouter.setFormResponse;
    op getFormResponse is FormResponseRouter.getFormResponse;

    // Submit an application after completing all forms
    op submitApplication is ApplicationRouter.submitApplication;
  }

  // #########################################################
  // Direct apply workflow
  // #########################################################
  @tag("experimental")
  @route("/competitions")
  namespace DirectApplyWorkflow {
    alias Router = Routes.Competitions;

    // View competition details
    op competitionDetails is Router.read;

    // Apply to a competition
    op apply is Router.apply;
  }
}
