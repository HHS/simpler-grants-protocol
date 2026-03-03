import "@common-grants/core";
import "@typespec/json-schema";

using CommonGrants.Fields;

namespace CustomFields.CostSharing;

/** Cost sharing or matching requirement; NOFO IC defines type, percentage, description, and waiver info */
model CustomCostSharing extends CustomField {
  name: "costSharing";
  fieldType: CustomFieldType.object;

  @example(#{
    type: "Matching",
    percentage: 25.0,
    description: "Recipients must provide 25% matching funds.",
    waiverInfo: "Waiver may be requested for equipment-only projects.",
  })
  value: {
    /** Type of cost sharing: Matching, Voluntary, Deferred, In-kind, or Exemption */
    type?: string;
    /** Required percentage (e.g. 25.0) */
    percentage?: numeric;
    /** Human-readable description (e.g. up to 5000 chars in NOFO IC) */
    description?: string;
    /** Waiver or exception information */
    waiverInfo?: string;
  };

  description: "Cost sharing or matching requirement details: type, percentage, description, and waiver information";
}
