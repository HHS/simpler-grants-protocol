import "@common-grants/core";
import "@typespec/json-schema";
import "./index.tsp";

using CommonGrants.Fields;
using JsonSchema;

namespace CustomFields.Agency;

/** Agency information including code and name.
 *
 * Deprecated for opportunities since protocol v0.5, which added
 * `OpportunityBase.funders`. Still valid for competitions and forms.
 */
@extension("x-tags", #[Tags.organization])
@extension("x-author", "CommonGrants")
@extension("x-version", "0.1.0")
@extension(
  "x-deprecated",
  #{
    note: "Deprecated for opportunities since protocol v0.5. Use OpportunityBase.funders instead.",
    href: "/custom-fields/overview/#migrating-from-agency-to-funders",
  }
)
@extension(
  "x-valid-schemas",
  #[
    ValidSchemas.OpportunityBase,
    ValidSchemas.CompetitionBase,
    ValidSchemas.FormBase
  ]
)
model CustomAgency extends CustomField {
  name: "agency";
  fieldType: CustomFieldType.object;

  @example(#{
    code: "CMS",
    name: "Centers for Medicare & Medicaid Services",
    parentCode: "HHS",
    parentName: "Health and Human Services",
  })
  value: {
    /** The agency's acronym or code */
    code?: string;

    /** The full name of the agency */
    name?: string;

    /** The acronym or code of the parent agency */
    parentCode?: string;

    /** The full name of the parent agency */
    parentName?: string;
  };

  description: "Information about the agency offering this opportunity";
}
