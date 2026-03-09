import "@common-grants/core";
import "@typespec/json-schema";

import "./org-address.tsp";
import "./poc-address.tsp";
import "./poc-name.tsp";
import "./org-ein.tsp";
import "./org-phone.tsp";

@JsonSchema.jsonSchema
namespace QuestionBank;
