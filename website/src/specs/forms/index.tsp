import "@common-grants/core";
import "@typespec/json-schema";

import "./cd511.tsp";
import "./formA.tsp";
import "./formB.tsp";
import "./key-contact.tsp";
import "./sf424-mandatory.tsp";
import "./sf424.tsp";
import "./sf424-individual.tsp";

using JsonSchema;

@JsonSchema.jsonSchema
namespace Forms;
