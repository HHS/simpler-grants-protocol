import "@common-grants/core";

using TypeSpec.Http;

@tag("Opportunities")
@route("/opportunities")
namespace Quickstart.Routes {
  alias OpportunitiesRouter = CommonGrants.Routes.Opportunities;

  op list is OpportunitiesRouter.list;
  op read is OpportunitiesRouter.read;
}
