import "@common-grants/core";

using TypeSpec.Http;

@tag("Opportunities")
@route("/common-grants/opportunities")
namespace Quickstart.Routes {
  alias OpportunitiesRouter = CommonGrants.Routes.Opportunities;

  op list is OpportunitiesRouter.list;
  op read is OpportunitiesRouter.read;
  op search is OpportunitiesRouter.search;
}
