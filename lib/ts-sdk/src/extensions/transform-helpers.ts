/**
 * Helper types for annotating hand-written `toCommon` / `fromCommon` functions.
 *
 * A flat, multi-key `definePlugin({ schemas })` can't infer a per-entry common
 * type to check an inline transform function, so authors annotate their
 * functions with these helpers to recover full typing: `source` typed from
 * `sourceSchema`, and the common side resolved from `model` + `customFields` —
 * exactly the inputs `definePlugin()` itself uses. Authors pass the specs they
 * already have, not a prebuilt common schema.
 *
 * @module @common-grants/sdk/extensions
 */

import { z } from "zod";
import { EXTENSIBLE_SCHEMA_MAP } from "./types";
import type { CustomFieldSpec, ExtensibleSchemaName, TransformResult } from "./types";
import type { WithCustomFieldsResult } from "./with-custom-fields";

/**
 * The single named argument for {@link ToCommon} / {@link FromCommon}.
 *
 * `model` names the extensible schema being transformed; it selects the base
 * schema from `EXTENSIBLE_SCHEMA_MAP`, so the common type is resolved per model
 * rather than assuming one hardcoded base. `customFields` is the field specs
 * (not a prebuilt common schema); omit it for the bare base schema.
 *
 * @example
 * ```ts
 * type OppTransform = {
 *   model: "Opportunity";
 *   sourceSchema: typeof GrantsGovOpportunity;
 *   customFields: typeof customFields;
 * };
 * const toCommon: ToCommon<OppTransform> = source => ({ result: { ... }, errors: [] });
 * ```
 */
export interface TransformTypes {
  /** The extensible model this transform targets (selects the base schema). */
  model: ExtensibleSchemaName;
  /** The source-system Zod schema; `source` is typed as its inferred type. */
  sourceSchema: z.ZodTypeAny;
  /** The custom field specs declared on the entry (NOT a prebuilt common schema). */
  customFields?: Record<string, CustomFieldSpec>;
}

/** The base Zod schema for the model named by `T["model"]`. */
type BaseSchemaOf<T extends TransformTypes> = (typeof EXTENSIBLE_SCHEMA_MAP)[T["model"]];

/**
 * The common Zod schema for `T`, resolved exactly as `definePlugin()` builds it:
 * the model's base schema, extended via `withCustomFields()` when `customFields`
 * is present.
 */
type CommonSchemaOf<T extends TransformTypes> =
  T["customFields"] extends Record<string, CustomFieldSpec>
    ? WithCustomFieldsResult<BaseSchemaOf<T>, T["customFields"]>
    : BaseSchemaOf<T>;

/**
 * Type for a hand-written `toCommon`.
 *
 * `source` is typed from `sourceSchema`; the return is checked against the
 * resolved common type. Both directions use the same common type because the
 * common date schemas accept either a string or a `Date` as input (they
 * normalize internally), so the author can build and return real `Date` values.
 *
 * @example
 * ```ts
 * const toCommon: ToCommon<{
 *   model: "Opportunity";
 *   sourceSchema: typeof GrantsGovOpportunity;
 *   customFields: typeof customFields;
 * }> = source => ({ result: { ... }, errors: [] });
 * ```
 */
export type ToCommon<T extends TransformTypes> = (
  source: z.infer<T["sourceSchema"]>
) => TransformResult<z.infer<CommonSchemaOf<T>>>;

/**
 * Type for a hand-written `fromCommon`.
 *
 * `common` is the resolved common type (what a consumer holds after `toCommon`
 * ran — e.g. date fields as `Date`). The return is the source type inferred
 * from `sourceSchema`.
 *
 * @example
 * ```ts
 * const fromCommon: FromCommon<{
 *   model: "Opportunity";
 *   sourceSchema: typeof GrantsGovOpportunity;
 *   customFields: typeof customFields;
 * }> = common => ({ result: { ... }, errors: [] });
 * ```
 */
export type FromCommon<T extends TransformTypes> = (
  common: z.infer<CommonSchemaOf<T>>
) => TransformResult<z.infer<T["sourceSchema"]>>;
