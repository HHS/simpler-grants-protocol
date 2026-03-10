import "@common-grants/core";
import "@typespec/json-schema";

import "./question-address.tsp";
import "./question-name.tsp";
import "./org-address.tsp";
import "./poc-address.tsp";
import "./poc-name.tsp";
import "./org-ein.tsp";
import "./org-phone.tsp";
import "./org-name.tsp";
import "./org-uei.tsp";
import "./poc-email.tsp";
import "./poc-phone.tsp";
import "./poc-title.tsp";

@JsonSchema.jsonSchema
namespace QuestionBank;

/** Tags for categorizing question bank items */
@JsonSchema.id("QuestionBank.Tags")
enum Tags {
  organization,
  contact,
  address,
  phone,
  email,
  identifier,
  name,
  proposal,
}
