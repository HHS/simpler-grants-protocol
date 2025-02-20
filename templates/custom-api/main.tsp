import "@typespec/http";
import "./routes.tsp";

using TypeSpec.Http;

/** API description here */
@service({
  title: "{{parameters.apiName}}",
})
namespace {{#casing.pascalCase}}{{name}}{{/casing.pascalCase}};
