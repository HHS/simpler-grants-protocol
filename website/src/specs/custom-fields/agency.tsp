import "@common-grants/core";
import "@typespec/json-schema";

using CommonGrants.Fields;

namespace CustomFields.Agency;

/** Agency information including code and name */
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
