import "./status.tsp";
import "./funding.tsp";
import "./timeline.tsp";
import "../../fields/index.tsp";
import "../../types.tsp";

/** Namespace for Core that are specific to funding opportunities */
namespace Core.Models.Opportunity;

using Core.Fields;
using Core.Types;

// ########################################
// Model definition
// ########################################

@doc("A funding opportunity") // Overrides internal docstrings when emitting OpenAPI
model OpportunityBase {
  /** Globally unique id for the opportunity */
  @visibility(Lifecycle.Read)
  id: uuid;

  /** Title or name of the funding opportunity */
  title: string;

  /** Status of the opportunity */
  status: OppStatus;

  /** Description of the opportunity's purpose and scope */
  description: string;

  /** Details about the funding available */
  fundingDetails: FundingDetails;

  /** Key dates for the opportunity, such as when the application opens and closes */
  keyDates: OppTimeline;

  /** URL for the original source of the opportunity */
  source?: url;

  /** Additional custom fields specific to this opportunity */
  customFields?: Record<CustomField>;

  // Spreads the fields from the Metadata model into the Opportunity model
  ...SystemMetadata;
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
    keyDates: #[EventExamples.openDate, EventExamples.deadline],
    customFields: #{
      programArea: CustomFieldExamples.programArea,
      eligibilityType: CustomFieldExamples.programArea,
    },
    ...MetadataExample.system,
  };

  /** A minimal opportunity example with only required fields */
  const minimal = #{
    id: "550e8400-e29b-41d4-a716-446655440001",
    source: "https://grants.gov/opportunity/456",
    title: "Small Business Innovation Grant",
    description: "Supporting small business innovation projects",
    fundingDetails: FundingExamples.onlyLimit,
    ...MetadataExample.system,
  };
}
