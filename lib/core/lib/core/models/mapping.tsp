namespace CommonGrants.Models;

// #########################################################
// Mapping
// #########################################################

/** A mapping format for translating data from one schema to another.
 *
 * Example:
 *
 * The following mapping:
 *
 * ```json
 * {
 *   "id": { "const": "123" },
 *   "opportunity": {
 *     "status": {
 *       "switch": {
 *         "field": "summary.opportunity_status",
 *         "case": { "active": "open", "inactive": "closed" },
 *         "default": "custom",
 *       },
 *     },
 *     "amount": { "field": "summary.opportunity_amount" },
 *   }
 * }
 * ```
 *
 * Will translate the following data:
 *
 * ```json
 * {
 *   "id": "123",
 *   "summary": {
 *     "opportunity_status": "active",
 *     "opportunity_amount": 100,
 *   },
 * }
 * ```
 *
 * To the following data:
 *
 * ```json
 * {
 *   "id": "123",
 *   "opportunity": { "status": "open", "amount": 100 },
 * }
 * ```
 */
@example(Examples.Mapping.flatRenaming)
@example(Examples.Mapping.nestedRenaming)
@example(Examples.Mapping.simpleSwitch)
@example(Examples.Mapping.nestedSwitch)
@example(Examples.Mapping.withLiteralValues)
@Versioning.added(CommonGrants.Versions.v0_2)
model MappingSchema {
  ...Record<MappingFunction | MappingSchema>;
}

// #########################################################
// MappingFunctions
// #########################################################

/** The set of supported mapping functions. */
@example(Examples.Mapping.constId)
@example(Examples.Mapping.amountField)
@example(Examples.Mapping.statusSwitch)
@Versioning.added(CommonGrants.Versions.v0_2)
union MappingFunction {
  `const`: MappingConstantFunction,
  field: MappingFieldFunction,
  switch: MappingSwitchFunction,
}

// #########################################################
// MappingConstantFunction
// #########################################################

/** Returns a constant value. */
@example(Examples.Mapping.constId)
@Versioning.added(CommonGrants.Versions.v0_2)
model MappingConstantFunction {
  `const`: unknown;
}

// #########################################################
// MappingFieldFunction
// #########################################################

/** Returns the value of a field in the source data. */
@example(Examples.Mapping.amountField)
@Versioning.added(CommonGrants.Versions.v0_2)
model MappingFieldFunction {
  field: string;
}

// #########################################################
// MappingSwitchFunction
// #########################################################

/** Returns a new value based on the value of a field in the source data using a switch statement. */
@example(Examples.Mapping.statusSwitch)
@Versioning.added(CommonGrants.Versions.v0_2)
model MappingSwitchFunction {
  switch: {
    /** The field in the source data to switch on. */
    field: string;

    /** An object mapping source field values to desired output values. */
    case: Record<unknown>;

    /** The default value to output if no case matches the source field value. */
    default?: unknown;
  };
}

// #########################################################
// Examples
// #########################################################

namespace Examples.Mapping {
  const constId = #{ `const`: "123" };
  const amountField = #{ field: "summary.opportunity_amount" };
  const statusField = #{ field: "summary.opportunity_status" };
  const statusSwitch = #{
    switch: #{
      field: "summary.opportunity_status",
      case: #{ active: "open", inactive: "closed" },
      default: "custom",
    },
  };

  const flatRenaming = #{
    id: constId,
    opportunityStatus: statusField,
    opportunityAmount: amountField,
  };

  const nestedRenaming = #{
    id: constId,
    opportunity: #{ status: statusField, amount: amountField },
  };

  const simpleSwitch = #{
    opportunityAmount: amountField,
    opportunityStatus: statusSwitch,
  };

  const nestedSwitch = #{
    opportunity: #{ status: statusSwitch, amount: amountField },
  };

  const withLiteralValues = #{
    id: constId,
    opportunity: #{ status: statusSwitch, amount: amountField },
  };
}
