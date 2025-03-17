import "@typespec/http";

import "./routes.tsp";

using TypeSpec.Http;

/** Description of the Custom API. */
@service({
    title: "Custom API",
})
namespace CustomAPI;
