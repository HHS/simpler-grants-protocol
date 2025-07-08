// Import Schemas.and Routes to make them available outside the package
import "./core/index.tsp";
import "@typespec/http";
import "@typespec/openapi";
import "@typespec/versioning";

using TypeSpec.Http;
using TypeSpec.OpenAPI;
using Versioning;

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
  #{
    description: "Endpoints related to applications for funding opportunities",
  }
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
  // Direct apply workflow
  // #########################################################
  @tag("experimental")
  @route("/competitions")
  namespace DirectApplyWorkflow {
    alias Router = Routes.Competitions;

    @added(Versions.v0_2)
    op competitionDetails is Router.read;

    @added(Versions.v0_2)
    op apply is Router.apply;
  }

  // #########################################################
  // Multi-step workflow
  // #########################################################

  @route("/applications")
  namespace MultiStepWorkflow {
    alias ApplicationRouter = Routes.Applications;
    alias FormResponseRouter = Routes.FormResponses;

    // ################################
    // Start an application workflow
    // ################################

    @added(Versions.v0_2)
    op startApplication is ApplicationRouter.startApplication;

    @added(Versions.v0_2)
    op getApplication is ApplicationRouter.getApplication;

    // ################################
    // Update form responses
    // ################################

    @added(Versions.v0_2)
    op setFormResponse is FormResponseRouter.setFormResponse;

    @added(Versions.v0_2)
    op getFormResponse is FormResponseRouter.getFormResponse;

    // ################################
    // Submit an application after completing all forms
    // ################################

    @added(Versions.v0_2)
    op submitApplication is ApplicationRouter.submitApplication;
  }
}
