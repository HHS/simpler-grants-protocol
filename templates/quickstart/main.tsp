import "@typespec/http";
import "./routes.tsp";

using TypeSpec.Http;

/** API description here */
@service({
  title: "Quickstart API",
})
namespace Quickstart;
