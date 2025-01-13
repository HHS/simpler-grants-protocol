import "@typespec/http";

import "./routes.tsp";

using TypeSpec.Http;

@service({
    title: "Custom API",
})
namespace CustomAPI;
