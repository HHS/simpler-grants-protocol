import "@common-grants/core";
import "@typespec/json-schema";

import "./key-contact.tsp";

using JsonSchema;

@JsonSchema.jsonSchema
namespace Forms;
