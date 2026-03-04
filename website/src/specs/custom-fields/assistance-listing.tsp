import "@common-grants/core";
import "@typespec/json-schema";
import "./index.tsp";

using CommonGrants.Fields;
using JsonSchema;

namespace CustomFields.AssistanceListing;

/** Assistance listing information; a single opportunity can have multiple listings (one primary, plus up to 50 additional) */
@extension("x-tags", #[Tags.program, Tags.federal, Tags.catalog])
@extension("x-author", "CommonGrants")
@extension("x-version", "0.1.0")
@extension(
  "x-valid-schemas",
  #[ValidSchemas.OpportunityBase, ValidSchemas.CompetitionBase]
)
model CustomAssistanceListing extends CustomField {
  name: "assistanceListing";
  fieldType: CustomFieldType.array;

  @example(#[
    #{
      assistanceListingNumber: "43.012",
      programTitle: "Space Technology",
      isPrimary: true,
    },
    #{
      assistanceListingNumber: "43.099",
      programTitle: "Related Program",
      isPrimary: false,
    }
  ])
  value: Array<{
    assistanceListingNumber: string;
    programTitle: string;

    /** True if this is the primary listing for the opportunity */
    isPrimary?: boolean;
  }>;

  description: "Assistance listing number(s) and program title(s) for this opportunity; one primary plus optional additional listings";
}
