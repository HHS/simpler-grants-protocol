// Import CommonGrants core library to expose the Base API specification
import "@common-grants/core";
import "@typespec/http";

using TypeSpec.Http;

// The docstring is emitted as the OpenAPI spec "description" property.
/** The base specification for a CommonGrants API */
@service({
    title: "CommonGrants API",
})
namespace Base;

@tag("Search")
@route("/opportunities")
namespace Opportunities {
    alias Router = CommonGrants.Routes.Opportunities;

    op list is Router.list;
    op read is Router.read;
}
