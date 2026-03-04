import "@common-grants/core";
import "@typespec/json-schema";
import "./index.tsp";

using CommonGrants.Fields;
using JsonSchema;

namespace CustomFields.Agency;

/** Agency information including code and name */
@extension("x-tags", #[Tags.agency, Tags.organization, Tags.federal])
@extension("x-author", "CommonGrants")
@extension("x-version", "0.1.0")
@extension(
  "x-valid-schemas",
  #[ValidSchemas.OpportunityBase, ValidSchemas.CompetitionBase]
)
model CustomAgency extends CustomField {
  name: "agency";
  fieldType: CustomFieldType.object;

  @example(#{
    agencyCode: "US-ABC",
    agencyName: "Department of Examples",
    topLevelAgencyName: "Department of Examples",
    topLevelAgencyCode: "US-ABC",
  })
  value: {
    agencyCode: string;
    agencyName: string;
    topLevelAgencyName?: string;

    /** Top-level agency code (e.g. federal department code) */
    topLevelAgencyCode?: string;
  };

  description: "Information about the agency offering this opportunity";
}
