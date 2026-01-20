import "@common-grants/core";
import "@typespec/json-schema";

using CommonGrants.Fields;
using TypeSpec.JsonSchema;

@jsonSchema
namespace CustomFields;

/** An integer ID for the opportunity, needed for compatibility with legacy systems */
model CustomLegacyId extends CustomField {
  name: "legacyId";
  fieldType: CustomFieldType.number;

  @example(12345)
  value: integer;

  description: "An integer ID for the opportunity, needed for compatibility with legacy systems";
}

/** The federal opportunity number (e.g., ABC-123-XYZ-001) */
model CustomFederalOpportunityNumber extends CustomField {
  name: "federalOpportunityNumber";
  fieldType: CustomFieldType.string;

  @example("ABC-123-XYZ-001")
  value: string;

  description: "The federal opportunity number assigned to this grant opportunity";
}

/** Assistance listing information including program title and number */
model CustomAssistanceListing extends CustomField {
  name: "assistanceListing";
  fieldType: CustomFieldType.object;

  @example(#{
    assistanceListingNumber: "43.012",
    programTitle: "Space Technology",
  })
  value: {
    assistanceListingNumber: string;
    programTitle: string;
  };

  description: "The assistance listing number and program title for this opportunity";
}

/** Agency information including code and name */
model CustomAgency extends CustomField {
  name: "agency";
  fieldType: CustomFieldType.object;

  @example(#{
    agencyCode: "US-ABC",
    agencyName: "Department of Examples",
    topLevelAgencyName: "Department of Examples",
  })
  value: {
    agencyCode: string;
    agencyName: string;
    topLevelAgencyName?: string;
  };

  description: "Information about the agency offering this opportunity";
}

/** List of attachments associated with the opportunity */
model CustomAttachments extends CustomField {
  name: "attachments";
  fieldType: CustomFieldType.array;

  @example(#[Examples.File.pdfFile])
  value: Array<File>;

  description: "Attachments such as NOFOs and supplemental documents for the opportunity";
}

/** The category of the opportunity (e.g., discretionary, mandatory) */
model CustomCategory extends CustomField {
  name: "category";
  fieldType: CustomFieldType.string;

  @example("discretionary")
  value: string;

  description: "The category type of the grant opportunity";
}

/** The fiscal year for the opportunity */
model CustomFiscalYear extends CustomField {
  name: "fiscalYear";
  fieldType: CustomFieldType.number;

  @example(2026)
  value: integer;

  description: "The fiscal year associated with this opportunity";
}

/** Indicates whether cost sharing or matching is required */
model CustomCostSharing extends CustomField {
  name: "costSharing";
  fieldType: CustomFieldType.boolean;

  @example(true)
  value: boolean;

  description: "Whether cost sharing or matching funds are required for this opportunity";
}

/** Additional information URL and description */
model CustomAdditionalInfo extends CustomField {
  name: "additionalInfo";
  fieldType: CustomFieldType.object;

  @example(#{ url: "grants.gov", description: "Click me for more info" })
  value: {
    url: string;
    description?: string;
  };

  description: "URL and description for additional information about the opportunity";
}

/** Agency contact information */
model CustomAgencyContact extends CustomField {
  name: "agencyContact";
  fieldType: CustomFieldType.object;

  @example(#{
    description: "For more information, reach out to Jane Smith at agency US-ABC",
    emailAddress: "fake_email@grants.gov",
    emailDescription: "Click me to email the agency",
  })
  value: {
    description?: string;
    emailAddress?: string;
    emailDescription?: string;
  };

  description: "Contact information for the agency managing this opportunity";
}
