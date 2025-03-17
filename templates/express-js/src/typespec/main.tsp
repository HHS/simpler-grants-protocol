import "@typespec/http";
import "@common-grants/core";

using TypeSpec.Http;

@service(#{ title: "CommonGrants API" })
namespace Custom;

@tag("Opportunities")
@route("/common-grants/opportunities")
namespace Routes {
  alias OpportunitiesRouter = CommonGrants.Routes.Opportunities;

  // Use the default model for list but custom model for read
  op list is OpportunitiesRouter.list;
  op read is OpportunitiesRouter.read;
  op search is OpportunitiesRouter.search;
}
