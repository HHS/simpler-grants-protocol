import "@common-grants/core";
import "@typespec/json-schema";

// Generic questions
import "./generics/question-address.tsp";
import "./generics/question-duns.tsp";
import "./generics/question-ein.tsp";
import "./generics/question-email.tsp";
import "./generics/question-name.tsp";
import "./generics/question-phone.tsp";
import "./generics/question-uei.tsp";

// Primary organization questions
import "./primary-org/org-address.tsp";
import "./primary-org/org-duns.tsp";
import "./primary-org/org-ein.tsp";
import "./primary-org/org-email.tsp";
import "./primary-org/org-name.tsp";
import "./primary-org/org-phone.tsp";
import "./primary-org/org-uei.tsp";
import "./primary-org/org-details.tsp";

// Fiscal sponsor questions
import "./fiscal-sponsor/fiscal-sponsor-address.tsp";
import "./fiscal-sponsor/fiscal-sponsor-ein.tsp";
import "./fiscal-sponsor/fiscal-sponsor-email.tsp";
import "./fiscal-sponsor/fiscal-sponsor-name.tsp";
import "./fiscal-sponsor/fiscal-sponsor-phone.tsp";
import "./fiscal-sponsor/fiscal-sponsor-uei.tsp";
import "./fiscal-sponsor/fiscal-sponsor-details.tsp";

// Primary point of contact questions
import "./poc/poc-address.tsp";
import "./poc/poc-email.tsp";
import "./poc/poc-name.tsp";
import "./poc/poc-phone.tsp";
import "./poc/poc-title.tsp";
import "./poc/poc-details.tsp";

// Principal investigator questions
import "./pi/pi-address.tsp";
import "./pi/pi-email.tsp";
import "./pi/pi-name.tsp";
import "./pi/pi-phone.tsp";
import "./pi/pi-title.tsp";
import "./pi/pi-details.tsp";

// Authorized organization representative questions
import "./aor/aor-address.tsp";
import "./aor/aor-email.tsp";
import "./aor/aor-name.tsp";
import "./aor/aor-phone.tsp";
import "./aor/aor-title.tsp";
import "./aor/aor-details.tsp";

// Project questions
import "./project/project-details.tsp";

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
  group,
}

/** Entity roles for categorizing question bank items by their semantic context */
@JsonSchema.id("QuestionBank.Entities")
enum Entities {
  primaryOrg,
  fiscalSponsor,
  poc,
  principalInvestigator,
  authorizedRepresentative,
}
