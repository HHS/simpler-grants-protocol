import "@common-grants/core";
import "@typespec/json-schema";

// OpportunityBase
import "./legacy-id.tsp";
import "./federal-opportunity-number.tsp";
import "./assistance-listing.tsp";
import "./agency.tsp";
import "./attachments.tsp";
import "./category.tsp";
import "./fiscal-year.tsp";
import "./cost-sharing.tsp";
import "./additional-info.tsp";
import "./agency-contact.tsp";
import "./eligibility-criteria.tsp";
import "./federal-funding-instruments.tsp";

// CompetitionBase
import "./contact-info.tsp";

// ApplicationBase (catalog only)
import "./applicant-organization.tsp";
import "./application-attachments.tsp";

// FormBase (catalog only)
import "./form-agency-code.tsp";
import "./form-type.tsp";
import "./omb-number.tsp";
import "./legacy-form-id.tsp";

@JsonSchema.jsonSchema
namespace CustomFields;

/** Central enum for custom field tags; used in x-tags JSON Schema extensions */
enum Tags {
  migration,
  compatibility,
  identifier,
  program,
  federal,
  catalog,
  application,
  organization,
  contact,
  communication,
  agency,
  documents,
  files,
  attachments,
  classification,
  type,
  fiscal,
  year,
  budget,
  funding,
  costSharing,
  matching,
  information,
  url,
  reference,
  eligibility,
  applicant,
  instruments,
  competition,
  catalogOnly,
  form,
  omb,
  pra,
}

enum ValidSchemas {
  OpportunityBase,
  CompetitionBase,
  ApplicationBase,
  FormBase,
}
