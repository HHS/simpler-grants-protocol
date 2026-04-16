import "@common-grants/core";
import "@typespec/json-schema";

import "./key-contact.tsp";
import "./sf424-mandatory.tsp";

using JsonSchema;

@JsonSchema.jsonSchema
namespace Forms;
