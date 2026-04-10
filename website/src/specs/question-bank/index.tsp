import "@common-grants/core";
import "@typespec/json-schema";

import "./generics/index.tsp";
import "./primary-org/index.tsp";
import "./fiscal-sponsor/index.tsp";
import "./poc/index.tsp";
import "./pi/index.tsp";
import "./aor/index.tsp";
import "./project/index.tsp";

@JsonSchema.jsonSchema
namespace QuestionBank;

/** Tags for categorizing question bank items by field type */
@JsonSchema.id("QuestionBank.Tags")
enum Tags {
  address,
  phone,
  email,
  identifier,
  name,
  title,
  proposal,
  details,
  person,
  organization,
  generic,
}

/** Entity roles for categorizing question bank items by their semantic context */
@JsonSchema.id("QuestionBank.Entities")
enum Entities {
  primaryOrg,
  fiscalSponsor,
  poc,
  principalInvestigator,
  authorizedRepresentative,
  project,
}
