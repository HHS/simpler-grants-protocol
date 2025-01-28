// Import CommonGrants core library to expose the Base API specification
import "@common-grants/core";
import "@typespec/http";

using TypeSpec.Http;

// Define the top-level namespace for the library
@service({
    name: "Base API",
})
namespace Base;

@tag("Search")
@route("/opportunities")
namespace Opportunities {
    alias Router = CommonGrants.Routes.Opportunities;

    op List is Router.list;
    op Read is Router.read;
}
