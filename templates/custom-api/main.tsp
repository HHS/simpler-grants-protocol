// main.tsp

import "@typespec/http";
import "./routes.tsp";

using TypeSpec.Http;

/** API description here */
@service({
  title: "{{parameters.apiName}}",
})
namespace {{parameters.namespace}};
