// Import the JS entry point for this library
// For more details see:
// https://typespec.io/docs/extending-typespec/basics/#h-add-your-main-typespec-file
import "../dist/src/index.js";
import "@typespec/json-schema";

import "./core/index.tsp";
import "./api.tsp";

namespace CommonGrants;

@TypeSpec.JsonSchema.jsonSchema
namespace CommonGrants.test {
  model Test {
    @example("test")
    name: string;
  }
}
