namespace CommonGrants.Models;

/**
 * A custom enum value, designed to be used as part of a union with known options
 *
 * @example How to use this CustomEnumValue in a union
 *
 * ```typespec
 * union OpportunityStatus {
 *   open: {
 *       value: "open",
 *       description?: "Opportunity is actively accepting applications",
 *   },
 *   closed: {
 *       value: "closed",
 *       description?: "Opportunity is no longer accepting applications",
 *   },
 *   custom: CustomEnumValue,
 * }
 * ```
 */
@doc("Custom value not included in the standard list of options.")
model CustomEnumValue {
  value: "custom";
  customValue: string;
  description: string;
}
