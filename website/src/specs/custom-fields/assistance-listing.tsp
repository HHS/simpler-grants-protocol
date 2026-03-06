import "@common-grants/core";
import "@typespec/json-schema";
import "./index.tsp";

using CommonGrants.Fields;
using JsonSchema;

namespace CustomFields.AssistanceListings;

/** Assistance listing information; a single opportunity can have multiple listings (one primary, plus up to 50 additional) */
@extension("x-tags", #[Tags.federal, Tags.funding])
@extension("x-author", "CommonGrants")
@extension("x-version", "0.1.0")
@extension(
  "x-valid-schemas",
  #[ValidSchemas.OpportunityBase, ValidSchemas.CompetitionBase]
)
model CustomAssistanceListings extends CustomField {
  name: "assistanceListings";
  fieldType: CustomFieldType.array;

  @example(#[
    #{ identifier: "43.012", programTitle: "Space Technology" },
    #{ identifier: "43.099", programTitle: "Related Program" }
  ])
  value: Array<{
    /** The assistance listing number, e.g. "43.012" */
    identifier?: string;

    /** The title of the federal assistance program */
    programTitle?: string;
  }>;

  description: "Assistance listing number(s) and program title(s) for this opportunity; one primary plus optional additional listings";
}
