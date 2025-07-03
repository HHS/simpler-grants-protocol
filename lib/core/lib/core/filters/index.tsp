import "./base.tsp";
import "./date.tsp";
import "./numeric.tsp";
import "./money.tsp";
import "./string.tsp";

using TypeSpec.JsonSchema;

/** A standard set of filters, e.g. `StringArrayFilter`, that can be reused across models
 *
 * @example How to use the `Filters` namespace
 *
 * ```typespec
 * import "@common-grants/core";
 *
 * using CommonGrants; // exposes the Filters namespace
 *
 * model MyFilters extends Record<Filters.DefaultFilter> {
 *   @example(#{
 *     operator: Filters.FilterOperators.in,
 *     value: #["foo", "bar", "baz"],
 *   })
 *   stringField: Filters.StringArrayFilter;
 *
 *   @example(#{ operator: Filters.FilterOperators.gt, value: 10 })
 *   numberField: Filters.NumberComparisonFilter;
 *
 *   @example(#{
 *     operator: Filters.FilterOperators.between,
 *     value: #{
 *       min: Types.isoDate.fromISO("2021-01-01"),
 *       max: Types.isoDate.fromISO("2021-01-02"),
 *     },
 *   })
 *   dateField: Filters.DateRangeFilter;
 * }
 * ```
 */
@jsonSchema
namespace CommonGrants.Filters;
