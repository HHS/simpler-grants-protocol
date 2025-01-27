namespace CommonGrants.Models;

// ########################################
// Model definition
// ########################################

/** The base model for a funding opportunity.
 *
 * It supports customization by templating the customFields property.
 *
 * @template Fields A CustomFieldMap object with user-defined custom fields,
 * that should be included in a given implementation of the Opportunity model.
 * @example Declare a new Opportunity model with custom fields
 *
 * ```typespec
 * model Agency extends CustomField {
 *   type: CustomFieldType.string;
 *   value: string;
 * }
 *
 * model NewFields extends CustomFieldMap {
 *   agency: Agency;
 * }
 *
 * alias CustomOpportunity = Opportunity<NewFields>;
 * ```
 */
@example(
  OpportunityExamples.complete,
  #{ title: "Complete opportunity with all fields" }
)
@example(
  OpportunityExamples.minimal,
  #{ title: "Minimal opportunity with required fields only" }
)
model Opportunity<Fields = CustomFieldMap> {
  /** Globally unique id for the opportunity */
  id: uuid;

  /** URL for the original source of the opportunity */
  source: url;

  /** Title or name of the funding opportunity */
  title: string;

  /** Description of the opportunity's purpose and scope */
  description: string;

  /** Details about the funding available */
  fundingDetails: FundingDetails;

  /** Key dates and milestones in the application process */
  applicationTimeline?: Event[];

  /** Additional custom fields specific to this opportunity */
  customFields?: Fields;
}

// ########################################
// Model examples
// ########################################

namespace OpportunityExamples {
  /** A complete opportunity example with all optional fields defined */
  const complete = #{
    id: "049b4b15-f219-4037-901e-cd95ac32fbc8",
    source: "https://grants.gov/opportunity/123",
    title: "Healthcare Innovation Research Grant",
    description: "Funding for innovative healthcare delivery solutions",
    fundingDetails: FundingExamples.allFields,
    applicationTimeline: #[EventExamples.openDate, EventExamples.deadline],
    customFields: #{
      programArea: CustomFieldExamples.programArea,
      eligibilityType: CustomFieldExamples.programArea,
    },
  };

  /** A minimal opportunity example with only required fields */
  const minimal = #{
    id: "550e8400-e29b-41d4-a716-446655440001",
    source: "https://grants.gov/opportunity/456",
    title: "Small Business Innovation Grant",
    description: "Supporting small business innovation projects",
    fundingDetails: FundingExamples.onlyLimit,
  };
}
