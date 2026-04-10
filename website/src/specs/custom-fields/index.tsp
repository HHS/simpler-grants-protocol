import "@common-grants/core";
import "@typespec/json-schema";

// OpportunityBase
import "./legacy-serial-id.tsp";
import "./federal-opportunity-number.tsp";
import "./assistance-listing.tsp";
import "./agency.tsp";
import "./attachments.tsp";
import "./federal-funding-source.tsp";
import "./cost-sharing.tsp";
import "./additional-info.tsp";
import "./fiscal-year.tsp";
import "./eligibility-criteria.tsp";
import "./federal-funding-instruments.tsp";

// CompetitionBase
import "./contact-info.tsp";

// ApplicationBase
import "./applicant-organization.tsp";

// FormBase
import "./form-group.tsp";
import "./omb-number.tsp";

@JsonSchema.jsonSchema
namespace CustomFields;

/** Central enum for custom field tags; used in x-tags JSON Schema extensions */
@JsonSchema.id("CustomFields.Tags")
enum Tags {
  identifier,
  federal,
  compatibility,
  funding,
  organization,
  context,
}

@JsonSchema.id("CustomFields.ValidSchemas")
enum ValidSchemas {
  OpportunityBase,
  CompetitionBase,
  ApplicationBase,
  FormBase,
}
