import "@typespec/json-schema";

import "./fields/index.tsp";
import "./models/index.tsp";

@TypeSpec.JsonSchema.jsonSchema
namespace CommonGrants;
