namespace CommonGrants.Models;

// #########################################################
// Mapping
// #########################################################

/** A mapping schema for translating data from one schema to another.
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
 *         "field": "opportunity_status",
 *         "case": { "active": "open", "inactive": "closed" },
 *         "default": "custom",
 *       },
 *     },
 *     "amount": { "field": "opportunity_amount" },
 *   }
 * }
 * ```
 *
 * Will translate the following data:
 *
 * ```json
 * {
 *   "id": "123",
 *   "opportunity_status": "active",
 *   "opportunity_amount": 100,
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
 */
@example(Examples.Mapping.flatRenaming)
@example(Examples.Mapping.nestedRenaming)
@example(Examples.Mapping.simpleSwitch)
@example(Examples.Mapping.nestedSwitch)
@example(Examples.Mapping.withLiteralValues)
model MappingSchema {
  ...Record<MappingFunction | unknown>;
}

// #########################################################
// MappingFunctions
// #########################################################

/** The set of supported mapping functions. */
union MappingFunction {
  `const`: MappingConstantFunction,
  field: MappingFieldFunction,
  switch: MappingSwitchFunction,
}

// #########################################################
// MappingLiteralFunction
// #########################################################

/** Returns a constant value. */
model MappingConstantFunction {
  `const`: unknown;
}

// #########################################################
// MappingFieldFunction
// #########################################################

/** Returns the value of a field in the source data. */
model MappingFieldFunction {
  field: string;
}

// #########################################################
// MappingSwitchFunction
// #########################################################

/** Returns a new value based on the value of a field in the source data using a switch statement. */
model MappingSwitchFunction {
  /** The field in the source data to switch on. */
  field: string;

  /** An object mapping source field values to desired output values. */
  case: Record<unknown>;

  /** The default value to output if no case matches the source field value. */
  default?: unknown;
}

// #########################################################
// Examples
// #########################################################

namespace Examples.Mapping {
  const flatRenaming = #{
    opportunityStatus: #{ field: "opportunity_status" },
    opportunityAmount: #{ field: "opportunity_amount" },
  };

  const nestedRenaming = #{
    id: #{ field: "opportunity_id" },
    opportunity: #{
      status: #{ field: "opportunity_status" },
      amount: #{ field: "opportunity_amount" },
    },
  };

  const simpleSwitch = #{
    opportunityAmount: #{ field: "opportunity_amount" },
    opportunityStatus: #{
      switch: #{
        field: "opportunity_status",
        case: #{ active: "open", inactive: "closed" },
        default: "custom",
      },
    },
  };

  const nestedSwitch = #{
    opportunity: #{
      status: #{
        switch: #{
          field: "opportunity_status",
          case: #{ active: "open", inactive: "closed" },
          default: "custom",
        },
        amount: #{ field: "opportunity_amount" },
      },
    },
  };

  const withLiteralValues = #{
    id: #{ `const`: "123" },
    opportunity: #{
      status: #{
        switch: #{
          field: "opportunity_status",
          case: #{ active: "open", inactive: "closed" },
          default: "custom",
        },
      },
      amount: #{ field: "opportunity_amount" },
    },
  };

  const formToCommonGrants = #{
    name: #{ field: "name" },
    email: #{ field: "email" },
    phone: #{ field: "phone" },
  };
}
