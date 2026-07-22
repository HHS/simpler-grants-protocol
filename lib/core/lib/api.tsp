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
@tagMetadata("Forms", #{ description: "Endpoints related to forms" })
@tagMetadata(
  "Application Reviews",
  #{
    description: "Endpoints related to reviewing applications for a given competition",
  }
)
@tagMetadata(
  "Applications",
  #{
    description: "Endpoints related to submitting applications for a given competition",
  }
)
@tagMetadata(
  "Competitions",
  #{
    description: "Endpoints related to competitions, which are distinct application processes for the same funding opportunity",
  }
)
@tagMetadata(
  "Opportunities",
  #{ description: "Endpoints related to funding opportunities" }
)
@tagMetadata("Awards", #{ description: "Endpoints related to grant awards" })
@tagMetadata(
  "Organizations",
  #{
    description: "Endpoints related to viewing and syncing organization profiles",
  }
)
@route("/common-grants") // Prefixes all routes with `/common-grants/`
namespace CommonGrants.API;

// #########################################################
// Authentication
// #########################################################

/** OAuth 2.0 authentication for organization profile syncing, following
 * ADR-0026. Supports the client credentials and authorization code (with PKCE)
 * flows. The flow URLs below are illustrative placeholders that each deployment
 * overrides with its own authorization server. JWT claim requirements (such as
 * a namespaced `org_id`) are documented in ADR-0026, not encoded here.
 *
 * @template Scopes The scopes an operation requires.
 */
alias OrgSyncAuth<Scopes extends string[]> = OAuth2Auth<[
  {
    type: OAuth2FlowType.clientCredentials;
    tokenUrl: "https://auth.example.com/oauth/token";
    scopes: Scopes;
  },
  {
    type: OAuth2FlowType.authorizationCode;
    authorizationUrl: "https://auth.example.com/authorize";
    tokenUrl: "https://auth.example.com/oauth/token";
    scopes: Scopes;
  }
]>;

// #########################################################
// Opportunities
// #########################################################

@tag("Opportunities")
@route("/opportunities")
namespace Opportunities {
  alias Router = Routes.Opportunities;

  @tag("required")
  op list is Router.list;

  @tag("required")
  @returnTypeChangedFrom(
    CommonGrants.Versions.v0_2,
    Responses.OkT<Models.OpportunityBase> | Responses.NotFound
  )
  op read is Router.read;

  @tag("optional")
  op search is Router.search;
}

// #########################################################
// Awards
// #########################################################

@tag("Awards")
@tag("experimental")
@route("/awards")
namespace Awards {
  alias Router = Routes.Awards;

  @added(Versions.v0_4)
  op list is Router.list;

  @added(Versions.v0_4)
  op read is Router.read;

  @added(Versions.v0_4)
  op search is Router.search;
}

// #########################################################
// Organizations
// #########################################################

@tag("Organizations")
@tag("experimental")
@route("/orgs")
namespace Organizations {
  alias Router = Routes.Organizations;

  @added(Versions.v0_4)
  @useAuth(OrgSyncAuth<["org:read"]>)
  op list is Router.list;

  @added(Versions.v0_4)
  @useAuth(OrgSyncAuth<["org:read"]>)
  op read is Router.read;

  @added(Versions.v0_4)
  @useAuth(OrgSyncAuth<["org:write"]>)
  op update is Router.update;

  @added(Versions.v0_4)
  @useAuth(OrgSyncAuth<["org.changes:write"]>)
  op submitChange is Router.submitChange;

  @added(Versions.v0_4)
  @useAuth(OrgSyncAuth<["org.changes:read"]>)
  op listChanges is Router.listChanges;

  @added(Versions.v0_4)
  @useAuth(OrgSyncAuth<["org.changes:read"]>)
  op viewChange is Router.viewChange;
}

// #########################################################
// Competitions
// #########################################################

@tag("Competitions")
@tag("experimental")
@route("/competitions")
namespace Competitions {
  alias Router = Routes.Competitions;

  @added(Versions.v0_2)
  op read is Router.read;
}

// #########################################################
// Applications
// #########################################################

@tag("Applications")
@tag("experimental")
@route("/applications")
namespace Applications {
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

  // ################################
  // Search applications
  // ################################

  @added(Versions.v0_3)
  @tag("Application Reviews")
  op searchApplications is ApplicationRouter.searchApplications;
}

// #########################################################
// Forms
// #########################################################

@tag("Forms")
@tag("experimental")
@route("/forms")
namespace Forms {
  alias Router = Routes.Forms;

  @added(Versions.v0_2)
  op list is Router.list;

  @added(Versions.v0_2)
  op read is Router.read;
}
